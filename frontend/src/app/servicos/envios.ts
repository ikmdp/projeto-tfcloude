import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type StatusEnvio =
  | 'Em análise'
  | 'Ajustes solicitados'
  | 'Aprovado'
  | 'Reprovado'
  | 'Removido';

export type TipoEvento =
  | 'enviado'
  | 'ajustes'
  | 'reenviado'
  | 'aprovado'
  | 'reprovado'
  | 'editado'
  | 'removido'
  | 'restaurado';

export type Decisao = 'aprovado' | 'reprovado' | 'ajustes';

export interface EventoEnvio {
  tipo: TipoEvento;
  em: string; // data em formato ISO
  por: string;
  motivo?: string;
}

export interface Envio {
  id: string;
  titulo: string;
  /** Nome(s) do(s) aluno(s) já juntos para exibição ("Ana e Bruno"). */
  autor: string;
  alunos: string[];
  turma: string;
  turno: string;
  curso: string;
  enviadoEm: string; // data do primeiro envio
  status: StatusEnvio;
  versao: number;
  historico: EventoEnvio[];
  motivo?: string; // motivo da última devolução, reprovação ou remoção
  orientador?: string; // professor orientador
  enviadoPor: string; // professor que fez o envio
  palavrasChave?: string[];
  arquivoNome?: string;
  arquivoTamanho?: number;
}

export type NovoEnvio = Omit<Envio, 'id' | 'versao' | 'historico' | 'motivo' | 'autor'>;

export interface Correcao {
  titulo: string;
  curso: string;
  orientador: string;
  alunos: string[];
  turma: string;
  turno: string;
  palavrasChave: string[];
  arquivoNome: string;
  arquivoTamanho: number;
}

export interface DadosEdicao {
  titulo: string;
  curso: string;
  orientador: string;
  palavrasChave: string[];
  alunos?: string[];
  turma?: string;
  turno?: string;
}

const CHAVE_ENVIOS = 'tfcloud_envios';

const STATUS_DA_DECISAO: Record<Decisao, StatusEnvio> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  ajustes: 'Ajustes solicitados',
};

/** "Ana", "Ana e Bruno" ou "Ana, Bruno e Carla". */
export function resumoAlunos(alunos: string[]): string {
  if (alunos.length <= 2) return alunos.join(' e ');
  return `${alunos.slice(0, -1).join(', ')} e ${alunos[alunos.length - 1]}`;
}

/** Data do envio mais recente (o original ou o último reenvio). */
export function dataUltimoEnvio(envio: Envio): string {
  for (let i = envio.historico.length - 1; i >= 0; i--) {
    const tipo = envio.historico[i].tipo;
    if (tipo === 'enviado' || tipo === 'reenviado') return envio.historico[i].em;
  }
  return envio.enviadoEm;
}

@Injectable({ providedIn: 'root' })
export class Envios {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // ---------- Consultas ----------

  /** Envios feitos por um usuário (professor), do mais novo para o mais antigo. */
  listar(email: string): Envio[] {
    const lista = this.lerTudo()[this.chave(email)] ?? [];
    return this.maisNovosPrimeiro(lista);
  }

  /** Todos os envios de todos os usuários, do mais novo para o mais antigo. */
  listarTodos(): Envio[] {
    return this.maisNovosPrimeiro(Object.values(this.lerTudo()).flat());
  }

  /** Trabalhos aprovados de todos os usuários (alimenta o acervo). */
  listarAprovados(): Envio[] {
    return this.listarTodos().filter((e) => e.status === 'Aprovado');
  }

  /** Trabalhos retirados do acervo pela coordenação. */
  listarRemovidos(): Envio[] {
    return this.listarTodos().filter((e) => e.status === 'Removido');
  }

  /** Fila da coordenação: em análise, do mais antigo ao mais novo. */
  listarEmAnalise(): Envio[] {
    return this.listarTodos()
      .filter((e) => e.status === 'Em análise')
      .reverse();
  }

  obter(id: string): Envio | null {
    return this.achar(this.lerTudo(), id);
  }

  obterDoUsuario(email: string, id: string): Envio | null {
    const lista = this.lerTudo()[this.chave(email)] ?? [];
    return lista.find((e) => e.id === id) ?? null;
  }

  // ---------- Ações do professor ----------

  adicionar(email: string, dados: NovoEnvio): Envio {
    const envio: Envio = {
      ...dados,
      id: this.novoId(),
      autor: resumoAlunos(dados.alunos),
      versao: 1,
      historico: [{ tipo: 'enviado', em: dados.enviadoEm, por: dados.enviadoPor }],
    };
    const tudo = this.lerTudo();
    const chave = this.chave(email);
    tudo[chave] = [...(tudo[chave] ?? []), envio];
    this.gravarTudo(tudo);
    return envio;
  }

  /** O professor corrige o trabalho devolvido e reenvia para a fila. */
  reenviar(email: string, id: string, dados: Correcao, por: string): Envio | null {
    const tudo = this.lerTudo();
    const envio = (tudo[this.chave(email)] ?? []).find((e) => e.id === id);
    if (!envio || envio.status !== 'Ajustes solicitados') return null;

    envio.titulo = dados.titulo;
    envio.curso = dados.curso;
    envio.orientador = dados.orientador;
    envio.alunos = dados.alunos;
    envio.autor = resumoAlunos(dados.alunos);
    envio.turma = dados.turma;
    envio.turno = dados.turno;
    envio.palavrasChave = dados.palavrasChave;
    envio.arquivoNome = dados.arquivoNome;
    envio.arquivoTamanho = dados.arquivoTamanho;
    envio.versao += 1;
    envio.status = 'Em análise';
    envio.motivo = undefined;
    envio.historico.push({ tipo: 'reenviado', em: new Date().toISOString(), por });

    this.gravarTudo(tudo);
    return envio;
  }

  // ---------- Ações da coordenação ----------

  /** Aprova, reprova ou devolve para ajustes. Só vale para trabalhos em análise. */
  decidir(id: string, decisao: Decisao, por: string, motivo?: string): Envio | null {
    const tudo = this.lerTudo();
    const envio = this.achar(tudo, id);
    if (!envio || envio.status !== 'Em análise') return null;

    const texto = decisao === 'aprovado' ? undefined : motivo?.trim();
    envio.status = STATUS_DA_DECISAO[decisao];
    envio.motivo = texto;
    envio.historico.push({ tipo: decisao, em: new Date().toISOString(), por, motivo: texto });

    this.gravarTudo(tudo);
    return envio;
  }

  /** Desfaz a última decisão e devolve o trabalho para a fila. */
  desfazerDecisao(id: string): boolean {
    const tudo = this.lerTudo();
    const envio = this.achar(tudo, id);
    if (!envio) return false;

    const ultimo = envio.historico[envio.historico.length - 1];
    const decisoes: TipoEvento[] = ['ajustes', 'aprovado', 'reprovado'];
    if (!ultimo || !decisoes.includes(ultimo.tipo)) return false;

    envio.historico.pop();
    envio.status = 'Em análise';
    envio.motivo = undefined;

    this.gravarTudo(tudo);
    return true;
  }

  /** Corrige os dados de um trabalho já aprovado. */
  editar(id: string, dados: DadosEdicao, por: string, resumo: string): Envio | null {
    const tudo = this.lerTudo();
    const envio = this.achar(tudo, id);
    if (!envio || envio.status !== 'Aprovado') return null;

    envio.titulo = dados.titulo;
    envio.curso = dados.curso;
    envio.orientador = dados.orientador;
    envio.palavrasChave = dados.palavrasChave;

    if (dados.alunos?.length) {
      envio.alunos = dados.alunos;
      envio.autor = resumoAlunos(dados.alunos);
    }
    if (dados.turma !== undefined) envio.turma = dados.turma;
    if (dados.turno !== undefined) envio.turno = dados.turno;

    envio.historico.push({ tipo: 'editado', em: new Date().toISOString(), por, motivo: resumo });

    this.gravarTudo(tudo);
    return envio;
  }

  /** Tira um trabalho aprovado do acervo, com o motivo. */
  removerDoAcervo(id: string, por: string, motivo: string): Envio | null {
    const tudo = this.lerTudo();
    const envio = this.achar(tudo, id);
    if (!envio || envio.status !== 'Aprovado') return null;

    envio.status = 'Removido';
    envio.motivo = motivo.trim();
    envio.historico.push({
      tipo: 'removido',
      em: new Date().toISOString(),
      por,
      motivo: envio.motivo,
    });

    this.gravarTudo(tudo);
    return envio;
  }

  /** Devolve ao acervo um trabalho que tinha sido removido. */
  restaurarAoAcervo(id: string, por: string): Envio | null {
    const tudo = this.lerTudo();
    const envio = this.achar(tudo, id);
    if (!envio || envio.status !== 'Removido') return null;

    envio.status = 'Aprovado';
    envio.motivo = undefined;
    envio.historico.push({ tipo: 'restaurado', em: new Date().toISOString(), por });

    this.gravarTudo(tudo);
    return envio;
  }

  /** Apaga todos os envios de um usuário (usado só nos testes). */
  limpar(email: string) {
    const tudo = this.lerTudo();
    delete tudo[this.chave(email)];
    this.gravarTudo(tudo);
  }

  // ---------- Internos ----------

  private maisNovosPrimeiro(lista: Envio[]): Envio[] {
    return [...lista].sort(
      (a, b) => new Date(dataUltimoEnvio(b)).getTime() - new Date(dataUltimoEnvio(a)).getTime(),
    );
  }

  private achar(tudo: Record<string, Envio[]>, id: string): Envio | null {
    for (const lista of Object.values(tudo)) {
      const envio = lista.find((e) => e.id === id);
      if (envio) return envio;
    }
    return null;
  }

  private chave(email: string): string {
    return email.trim().toLowerCase();
  }

  private novoId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** Lê o que está salvo e completa os campos que envios antigos não tinham. */
  private lerTudo(): Record<string, Envio[]> {
    if (!this.ehNavegador) return {};
    try {
      const bruto = JSON.parse(localStorage.getItem(CHAVE_ENVIOS) ?? '{}') as Record<
        string,
        Partial<Envio>[]
      >;
      const tudo: Record<string, Envio[]> = {};
      for (const [chave, lista] of Object.entries(bruto)) {
        tudo[chave] = lista.map((e) => this.normalizar(e));
      }
      return tudo;
    } catch {
      return {};
    }
  }

  private normalizar(e: Partial<Envio>): Envio {
    const enviadoEm = e.enviadoEm ?? new Date().toISOString();
    const autorAntigo = e.autor ?? '';
    const alunos = e.alunos?.length ? e.alunos : autorAntigo ? [autorAntigo] : [];

    return {
      id: e.id ?? this.novoId(),
      titulo: e.titulo ?? '',
      autor: alunos.length ? resumoAlunos(alunos) : autorAntigo,
      alunos,
      turma: e.turma ?? '',
      turno: e.turno ?? '',
      curso: e.curso ?? '',
      enviadoEm,
      status: e.status ?? 'Em análise',
      versao: e.versao ?? 1,
      historico: e.historico?.length
        ? e.historico
        : [{ tipo: 'enviado', em: enviadoEm, por: e.enviadoPor ?? autorAntigo }],
      motivo: e.motivo,
      orientador: e.orientador,
      enviadoPor: e.enviadoPor ?? '',
      palavrasChave: e.palavrasChave,
      arquivoNome: e.arquivoNome,
      arquivoTamanho: e.arquivoTamanho,
    };
  }

  private gravarTudo(tudo: Record<string, Envio[]>) {
    if (!this.ehNavegador) return;
    try {
      localStorage.setItem(CHAVE_ENVIOS, JSON.stringify(tudo));
    } catch {
      // Armazenamento bloqueado ou cheio: ignora.
    }
  }
}