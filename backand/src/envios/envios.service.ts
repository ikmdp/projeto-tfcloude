import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { ArmazenamentoService } from './armazenamento.service.js';
import type { Decisao, StatusEnvio, TipoEvento } from './constantes.js';
import { ConsultaAcervoDto } from './dto/consulta-acervo.dto.js';
import { DadosEnvioDto } from './dto/dados-envio.dto.js';
import { DecisaoDto } from './dto/decisao.dto.js';
import { Envio } from './envio.entity.js';

const STATUS_DA_DECISAO: Record<Decisao, StatusEnvio> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  ajustes: 'Ajustes solicitados',
};

/** Tira acentos e maiúsculas: "José" e "jose" contam como iguais. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** "Ana", "Ana e Bruno" ou "Ana, Bruno e Carla". */
function juntarAlunos(alunos: string[]): string {
  if (alunos.length <= 2) return alunos.join(' e ');
  return `${alunos.slice(0, -1).join(', ')} e ${alunos[alunos.length - 1]}`;
}

/** Limpa o nome que a pessoa deu ao arquivo, para exibir e baixar. */
function nomeSeguro(original: string): string {
  let nome = original;

  // Alguns navegadores mandam o nome em outra codificação e os acentos quebram
  if (/^[\u0000-\u00ff]*$/.test(original)) {
    const convertido = Buffer.from(original, 'latin1').toString('utf8');
    if (!convertido.includes('\uFFFD')) nome = convertido;
  }

  nome = nome
    .replace(/[\u0000-\u001f\u007f"\\/:*?<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!nome) nome = 'trabalho.pdf';
  if (!nome.toLowerCase().endsWith('.pdf')) nome = `${nome}.pdf`;
  return nome.slice(-150);
}

function paraResumo(e: Envio) {
  return {
    id: e.id,
    titulo: e.titulo,
    alunos: e.alunos,
    autor: juntarAlunos(e.alunos),
    turma: e.turma,
    turno: e.turno,
    curso: e.curso,
    orientadorId: e.orientadorId,
    orientador: e.orientadorNome,
    enviadoPor: e.enviadoPorNome,
    palavrasChave: e.palavrasChave,
    status: e.status,
    versao: e.versao,
    motivo: e.motivo,
    arquivo: { nome: e.arquivoNome, tamanho: e.arquivoTamanho },
    enviadoEm: e.enviadoEm,
    ultimoEnvioEm: e.ultimoEnvioEm,
    atualizadoEm: e.atualizadoEm,
  };
}

function paraDetalhe(e: Envio) {
  return { ...paraResumo(e), historico: e.historico };
}

/** O que o acervo mostra: sem motivo, histórico nem quem enviou. */
function paraAcervo(e: Envio) {
  return {
    id: e.id,
    titulo: e.titulo,
    alunos: e.alunos,
    autor: juntarAlunos(e.alunos),
    curso: e.curso,
    turma: e.turma,
    turno: e.turno,
    orientador: e.orientadorNome,
    palavrasChave: e.palavrasChave,
    ano: new Date(e.enviadoEm).getFullYear(),
    tamanho: e.arquivoTamanho,
  };
}

@Injectable()
export class EnviosService {
  constructor(
    @InjectRepository(Envio) private readonly repo: Repository<Envio>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly arquivos: ArmazenamentoService,
  ) {}

  // ---------- Professor ----------

  async criar(usuario: Usuario, dto: DadosEnvioDto, arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Anexe o arquivo do trabalho em PDF.');

    const dados = this.limparDados(dto);
    const orientador = await this.buscarOrientador(dto.orientadorId);
    const salvo = await this.arquivos.salvar(arquivo);
    const agora = new Date();

    try {
      const criado = await this.repo.save(
        this.repo.create({
          ...dados,
          orientadorId: orientador.id,
          orientadorNome: orientador.nome,
          enviadoPorId: usuario.id,
          enviadoPorNome: usuario.nome,
          status: 'Em análise',
          versao: 1,
          motivo: null,
          historico: [{ tipo: 'enviado', em: agora.toISOString(), por: usuario.nome }],
          arquivoChave: salvo.chave,
          arquivoNome: nomeSeguro(arquivo.originalname),
          arquivoTamanho: salvo.tamanho,
          arquivoHash: salvo.hash,
          ultimoEnvioEm: agora,
          revisao: 0,
        }),
      );
      return paraDetalhe(await this.obterOuFalhar(criado.id));
    } catch (erro) {
      // Não deixa PDF solto no disco se o registro não foi criado
      await this.arquivos.remover(salvo.chave);
      throw erro;
    }
  }

  async meus(usuario: Usuario) {
    const lista = await this.repo.find({
      where: { enviadoPorId: usuario.id },
      order: { ultimoEnvioEm: 'DESC' },
    });
    return lista.map(paraResumo);
  }

  async orientadores() {
    const lista = await this.usuarios.find({
      where: { papel: 'professor', ativo: true },
      order: { nome: 'ASC' },
    });
    return lista.map((p) => ({ id: p.id, nome: p.nome }));
  }

  /** O professor corrige o trabalho devolvido e reenvia para a fila. */
  async reenviar(usuario: Usuario, id: string, dto: DadosEnvioDto, arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Anexe a versão corrigida do trabalho em PDF.');

    const atual = await this.repo.findOne({ where: { id } });
    if (!atual || atual.enviadoPorId !== usuario.id) {
      throw new NotFoundException('Trabalho não encontrado.');
    }
    if (atual.status !== 'Ajustes solicitados') {
      throw new ConflictException('Este trabalho não está esperando correções.');
    }

    const dados = this.limparDados(dto);
    const orientador = await this.escolherOrientador(dto.orientadorId, atual);
    const novo = await this.arquivos.salvar(arquivo);
    let chaveAntiga = '';

    try {
      await this.modificar(id, (e) => {
        if (e.status !== 'Ajustes solicitados') {
          throw new ConflictException('Este trabalho não está esperando correções.');
        }

        chaveAntiga = e.arquivoChave;
        Object.assign(e, dados, {
          orientadorId: orientador.id,
          orientadorNome: orientador.nome,
          arquivoChave: novo.chave,
          arquivoNome: nomeSeguro(arquivo.originalname),
          arquivoTamanho: novo.tamanho,
          arquivoHash: novo.hash,
          versao: e.versao + 1,
          status: 'Em análise' as StatusEnvio,
          motivo: null,
          ultimoEnvioEm: new Date(),
        });
        this.registrar(e, 'reenviado', usuario.nome);
      });
    } catch (erro) {
      await this.arquivos.remover(novo.chave);
      throw erro;
    }

    // O PDF antigo só some depois que o novo foi aceito
    await this.arquivos.remover(chaveAntiga);
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  // ---------- Coordenação ----------

  async listar(status?: StatusEnvio) {
    const lista = await this.repo.find({
      where: status ? { status } : {},
      order: { ultimoEnvioEm: 'DESC' },
    });
    return lista.map(paraResumo);
  }

  /** Fila de avaliação: do mais antigo ao mais novo. */
  async fila() {
    const lista = await this.repo.find({
      where: { status: 'Em análise' },
      order: { ultimoEnvioEm: 'ASC' },
    });
    return lista.map(paraResumo);
  }

  async decidir(id: string, admin: Usuario, dto: DecisaoDto) {
    await this.modificar(id, (e) => {
      if (e.status !== 'Em análise') {
        throw new ConflictException('Este trabalho já foi avaliado ou não está na fila.');
      }

      const motivo = dto.decisao === 'aprovado' ? undefined : dto.motivo?.trim();
      e.status = STATUS_DA_DECISAO[dto.decisao];
      e.motivo = motivo ?? null;
      this.registrar(e, dto.decisao, admin.nome, motivo);
    });
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  /** Desfaz a última decisão e devolve o trabalho para a fila. */
  async desfazer(id: string) {
    const esperado: Partial<Record<TipoEvento, StatusEnvio>> = {
      ajustes: 'Ajustes solicitados',
      aprovado: 'Aprovado',
      reprovado: 'Reprovado',
    };

    await this.modificar(id, (e) => {
      const ultimo = e.historico[e.historico.length - 1];
      if (!ultimo || esperado[ultimo.tipo] !== e.status) {
        throw new ConflictException('Não há decisão para desfazer neste trabalho.');
      }

      e.historico = e.historico.slice(0, -1);
      e.status = 'Em análise';
      e.motivo = null;
    });
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  /** Corrige os dados de um trabalho que já está no acervo. */
  async editar(id: string, admin: Usuario, dto: DadosEnvioDto) {
    const atual = await this.obterOuFalhar(id);
    const dados = this.limparDados(dto);
    const orientador = await this.escolherOrientador(dto.orientadorId, atual);

    await this.modificar(id, (e) => {
      if (e.status !== 'Aprovado') {
        throw new ConflictException('Só dá para editar trabalhos que estão no acervo.');
      }

      const mudou: string[] = [];
      if (dados.titulo !== e.titulo) mudou.push('título');
      if (dados.alunos.join('|') !== e.alunos.join('|')) mudou.push('alunos');
      if (dados.turma !== e.turma) mudou.push('turma');
      if (dados.turno !== e.turno) mudou.push('turno');
      if (dados.curso !== e.curso) mudou.push('curso');
      if (orientador.id !== e.orientadorId) mudou.push('orientador');
      if (dados.palavrasChave.join('|') !== e.palavrasChave.join('|')) mudou.push('palavras-chave');

      if (mudou.length === 0) throw new BadRequestException('Nenhuma alteração foi feita.');

      Object.assign(e, dados, { orientadorId: orientador.id, orientadorNome: orientador.nome });
      this.registrar(e, 'editado', admin.nome, `Alterou: ${mudou.join(', ')}`);
    });
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  /** Tira um trabalho do acervo, com o motivo. O PDF continua guardado. */
  async removerDoAcervo(id: string, admin: Usuario, motivo: string) {
    await this.modificar(id, (e) => {
      if (e.status !== 'Aprovado') {
        throw new ConflictException('Só dá para remover trabalhos que estão no acervo.');
      }

      e.status = 'Removido';
      e.motivo = motivo;
      this.registrar(e, 'removido', admin.nome, motivo);
    });
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  async restaurar(id: string, admin: Usuario) {
    await this.modificar(id, (e) => {
      if (e.status !== 'Removido') {
        throw new ConflictException('Este trabalho não foi removido do acervo.');
      }

      e.status = 'Aprovado';
      e.motivo = null;
      this.registrar(e, 'restaurado', admin.nome);
    });
    return paraDetalhe(await this.obterOuFalhar(id));
  }

  // ---------- Detalhe, acervo e download ----------

  async detalhe(usuario: Usuario, id: string) {
    const envio = await this.obterOuFalhar(id);
    if (!this.podeVerTudo(usuario, envio)) throw new NotFoundException('Trabalho não encontrado.');
    return paraDetalhe(envio);
  }

  /** Trabalhos aprovados. A busca ignora acentos e maiúsculas. */
  async acervo(consulta: ConsultaAcervoDto) {
    const aprovados = await this.repo.find({
      where: { status: 'Aprovado' },
      order: { enviadoEm: 'DESC' },
    });
    const termos = normalizar(consulta.q ?? '')
      .split(/\s+/)
      .filter(Boolean);

    return aprovados
      .filter((e) => {
        if (consulta.curso && e.curso !== consulta.curso) return false;
        if (termos.length === 0) return true;

        const texto = normalizar(
          [
            e.titulo,
            ...e.alunos,
            e.curso,
            e.turma,
            e.orientadorNome,
            String(new Date(e.enviadoEm).getFullYear()),
            ...e.palavrasChave,
          ].join(' '),
        );
        return termos.every((t) => texto.includes(t));
      })
      .map(paraAcervo);
  }

  /** Aprovado: qualquer pessoa logada. Os demais: só a coordenação e o professor que enviou. */
  async abrirArquivo(usuario: Usuario, id: string) {
    const envio = await this.obterOuFalhar(id);
    if (envio.status !== 'Aprovado' && !this.podeVerTudo(usuario, envio)) {
      throw new NotFoundException('Trabalho não encontrado.');
    }

    const { stream, tamanho } = await this.arquivos.abrir(envio.arquivoChave);
    return { stream, tamanho, nome: envio.arquivoNome };
  }

  // ---------- Internos ----------

  private podeVerTudo(usuario: Usuario, envio: Envio): boolean {
    return usuario.papel === 'admin' || envio.enviadoPorId === usuario.id;
  }

  private async obterOuFalhar(id: string): Promise<Envio> {
    const envio = await this.repo.findOne({ where: { id } });
    if (!envio) throw new NotFoundException('Trabalho não encontrado.');
    return envio;
  }

  /**
   * Altera um trabalho com segurança. Antes de gravar, "reserva a vez" pela revisão:
   * se outra pessoa mexeu no trabalho no meio do caminho, só uma das duas alterações passa.
   */
  private async modificar(id: string, aplicar: (envio: Envio) => void): Promise<Envio> {
    const envio = await this.obterOuFalhar(id);
    const antes = envio.revisao;

    aplicar(envio); // pode recusar com erro

    const reserva = await this.repo.update({ id, revisao: antes }, { revisao: antes + 1 });
    if (reserva.affected !== 1) {
      throw new ConflictException(
        'Este trabalho acabou de ser alterado por outra pessoa. Atualize a página e tente de novo.',
      );
    }

    envio.revisao = antes + 1;
    return this.repo.save(envio);
  }

  private registrar(envio: Envio, tipo: TipoEvento, por: string, motivo?: string) {
    envio.historico = [
      ...envio.historico,
      { tipo, em: new Date().toISOString(), por, ...(motivo ? { motivo } : {}) },
    ];
  }

  /** Confere repetições e devolve os dados prontos para gravar. */
  private limparDados(dto: DadosEnvioDto) {
    const nomes = dto.alunos.map(normalizar);
    if (new Set(nomes).size !== nomes.length) {
      throw new BadRequestException('Há alunos com o mesmo nome.');
    }

    const palavrasChave: string[] = [];
    for (const palavra of dto.palavrasChave) {
      if (!palavrasChave.some((p) => normalizar(p) === normalizar(palavra))) {
        palavrasChave.push(palavra);
      }
    }

    return {
      titulo: dto.titulo,
      alunos: dto.alunos,
      turma: dto.turma,
      turno: dto.turno,
      curso: dto.curso,
      palavrasChave,
    };
  }

  /** O orientador precisa ser um professor ativo. */
  private async buscarOrientador(id: string): Promise<{ id: string; nome: string }> {
    const professor = await this.usuarios.findOne({
      where: { id, papel: 'professor', ativo: true },
    });
    if (!professor) throw new BadRequestException('Selecione um professor orientador(a) cadastrado.');
    return { id: professor.id, nome: professor.nome };
  }

  /** Mantém o orientador que o trabalho já tinha, mesmo que ele tenha sido removido depois. */
  private async escolherOrientador(id: string, atual: Envio): Promise<{ id: string; nome: string }> {
    if (id === atual.orientadorId) {
      return { id: atual.orientadorId, nome: atual.orientadorNome };
    }
    return this.buscarOrientador(id);
  }
}