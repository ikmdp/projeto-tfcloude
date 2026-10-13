import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CursosService } from '../cursos/cursos.service.js';
import type { StatusEnvio } from '../envios/constantes.js';
import { Envio } from '../envios/envio.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { gerarCsv } from './csv.js';

export interface LinhaTabela {
  rotulo: string;
  enviados: number;
  aprovados: number;
  reprovados: number;
  emAndamento: number;
  removidos: number;
}

export interface Resumo {
  taxaAprovacao: number | null; // de 0 a 100
  tempoMedioMs: number | null;
  avaliacoes: number;
  maiorEsperaMs: number | null;
  naFila: number;
}

export interface Relatorio {
  resumo: Resumo;
  porCurso: LinhaTabela[];
  porTurno: LinhaTabela[];
  porProfessor: LinhaTabela[];
  porAno: LinhaTabela[];
  total: LinhaTabela;
}

const NAO_INFORMADO = 'Não informado';
const ORDEM_TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral'];

function linhaVazia(rotulo: string): LinhaTabela {
  return { rotulo, enviados: 0, aprovados: 0, reprovados: 0, emAndamento: 0, removidos: 0 };
}

function contar(linha: LinhaTabela, status: StatusEnvio) {
  linha.enviados += 1;
  if (status === 'Aprovado') linha.aprovados += 1;
  else if (status === 'Reprovado') linha.reprovados += 1;
  else if (status === 'Removido') linha.removidos += 1;
  else linha.emAndamento += 1; // Em análise ou Ajustes solicitados
}

function obter(mapa: Map<string, LinhaTabela>, rotulo: string): LinhaTabela {
  let linha = mapa.get(rotulo);
  if (!linha) {
    linha = linhaVazia(rotulo);
    mapa.set(rotulo, linha);
  }
  return linha;
}

/** Ordena e deixa "Não informado" sempre por último. */
function ordenar(
  mapa: Map<string, LinhaTabela>,
  comparar: (a: string, b: string) => number,
): LinhaTabela[] {
  return [...mapa.values()].sort((a, b) => {
    if (a.rotulo === NAO_INFORMADO) return 1;
    if (b.rotulo === NAO_INFORMADO) return -1;
    return comparar(a.rotulo, b.rotulo);
  });
}

/** "09/10/2026 20:15", no horário de Brasília. */
function dataHora(data: Date | string): string {
  return new Date(data)
    .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
    .replace(',', '');
}

function calcular(lista: Envio[], cursos: string[], professores: string[]): Relatorio {
  const porCurso = new Map<string, LinhaTabela>();
  for (const nome of cursos) porCurso.set(nome, linhaVazia(nome));

  const porTurno = new Map<string, LinhaTabela>();
  for (const nome of ORDEM_TURNOS) porTurno.set(nome, linhaVazia(nome));

  const porProfessor = new Map<string, LinhaTabela>();
  for (const nome of professores) porProfessor.set(nome, linhaVazia(nome));

  const porAno = new Map<string, LinhaTabela>();
  const total = linhaVazia('Total');

  const duracoes: number[] = [];
  let aprovacoes = 0;
  let reprovacoes = 0;
  let naFila = 0;
  let maiorEspera: number | null = null;
  const agora = Date.now();

  for (const envio of lista) {
    const ano = String(new Date(envio.enviadoEm).getFullYear());

    const linhas = [
      obter(porCurso, envio.curso || NAO_INFORMADO),
      obter(porTurno, envio.turno || NAO_INFORMADO),
      obter(porProfessor, envio.enviadoPorNome || NAO_INFORMADO),
      obter(porAno, ano),
      total,
    ];
    for (const linha of linhas) contar(linha, envio.status);

    // Tempo de avaliação: do envio (ou reenvio) até cada decisão
    let inicio: number | null = null;
    for (const evento of envio.historico) {
      const quando = new Date(evento.em).getTime();

      if (evento.tipo === 'enviado' || evento.tipo === 'reenviado') {
        inicio = quando;
      } else if (
        evento.tipo === 'aprovado' ||
        evento.tipo === 'reprovado' ||
        evento.tipo === 'ajustes'
      ) {
        if (evento.tipo === 'aprovado') aprovacoes += 1;
        if (evento.tipo === 'reprovado') reprovacoes += 1;

        if (inicio !== null) {
          duracoes.push(Math.max(0, quando - inicio));
          inicio = null;
        }
      }
    }

    if (envio.status === 'Em análise') {
      naFila += 1;
      const espera = agora - new Date(envio.ultimoEnvioEm).getTime();
      maiorEspera = maiorEspera === null ? espera : Math.max(maiorEspera, espera);
    }
  }

  const decididas = aprovacoes + reprovacoes;
  const alfabetica = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

  return {
    resumo: {
      taxaAprovacao: decididas ? Math.round((aprovacoes / decididas) * 100) : null,
      tempoMedioMs: duracoes.length
        ? duracoes.reduce((soma, d) => soma + d, 0) / duracoes.length
        : null,
      avaliacoes: duracoes.length,
      maiorEsperaMs: maiorEspera,
      naFila,
    },
    porCurso: ordenar(porCurso, alfabetica),
    porTurno: ordenar(porTurno, (a, b) => {
      const ia = ORDEM_TURNOS.indexOf(a);
      const ib = ORDEM_TURNOS.indexOf(b);
      if (ia === -1 && ib === -1) return alfabetica(a, b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }),
    porProfessor: ordenar(porProfessor, alfabetica),
    porAno: ordenar(porAno, (a, b) => Number(b) - Number(a)),
    total,
  };
}

@Injectable()
export class RelatoriosService {
  constructor(
    @InjectRepository(Envio) private readonly envios: Repository<Envio>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly cursos: CursosService,
  ) {}

  async gerar(): Promise<Relatorio> {
    const [lista, cursos, professores] = await Promise.all([
      this.envios.find(),
      this.cursos.listar(),
      this.usuarios.find({ where: { papel: 'professor', ativo: true } }),
    ]);

    return calcular(
      lista,
      cursos.map((c) => c.nome),
      professores.map((p) => p.nome),
    );
  }

  async csvTrabalhos(): Promise<{ conteudo: string; linhas: number }> {
    const lista = await this.envios.find({ order: { ultimoEnvioEm: 'DESC' } });

    const linhas: (string | number | null | undefined)[][] = [
      [
        'Título',
        'Alunos',
        'Turma',
        'Turno',
        'Curso',
        'Professor orientador',
        'Enviado por',
        'Palavras-chave',
        'Status',
        'Versão',
        'Enviado em',
        'Motivo',
        'Arquivo',
        'Tamanho (KB)',
      ],
      ...lista.map((e) => [
        e.titulo,
        e.alunos.join('; '),
        e.turma,
        e.turno,
        e.curso,
        e.orientadorNome,
        e.enviadoPorNome,
        e.palavrasChave.join('; '),
        e.status,
        e.versao,
        dataHora(e.enviadoEm),
        e.motivo,
        e.arquivoNome,
        Math.round(e.arquivoTamanho / 1024),
      ]),
    ];

    return { conteudo: gerarCsv(linhas), linhas: lista.length };
  }

  async csvResumo(): Promise<{ conteudo: string; linhas: number }> {
    const relatorio = await this.gerar();

    const linha = (grupo: string, l: LinhaTabela) => [
      grupo,
      l.rotulo,
      l.enviados,
      l.aprovados,
      l.reprovados,
      l.emAndamento,
      l.removidos,
    ];

    const linhas: (string | number)[][] = [
      ['Agrupamento', 'Valor', 'Enviados', 'Aprovados', 'Reprovados', 'Em andamento', 'Removidos'],
      ...relatorio.porCurso.map((l) => linha('Curso', l)),
      ...relatorio.porTurno.map((l) => linha('Turno', l)),
      ...relatorio.porProfessor.map((l) => linha('Professor (envio)', l)),
      ...relatorio.porAno.map((l) => linha('Ano', l)),
      linha('Total', relatorio.total),
    ];

    return { conteudo: gerarCsv(linhas), linhas: linhas.length - 1 };
  }
}