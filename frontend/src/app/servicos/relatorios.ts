import { Injectable } from '@angular/core';
import { Envio, StatusEnvio, dataUltimoEnvio } from './envios';

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
  porAno: LinhaTabela[];
  total: LinhaTabela;
}

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

/** "12 min", "5 h" ou "2,5 dias". */
export function formatarDuracao(ms: number): string {
  const minutos = Math.round(ms / 60000);
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${minutos} min`;

  const horas = ms / 3600000;
  if (horas < 24) return `${Math.round(horas)} h`;

  const dias = (horas / 24).toFixed(1);
  return `${dias.replace('.', ',')} ${dias === '1.0' ? 'dia' : 'dias'}`;
}

@Injectable({ providedIn: 'root' })
export class Relatorios {
  calcular(lista: Envio[], cursosCadastrados: string[]): Relatorio {
    const cursos = new Map<string, LinhaTabela>();
    for (const nome of cursosCadastrados) cursos.set(nome, linhaVazia(nome));

    const anos = new Map<number, LinhaTabela>();
    const total = linhaVazia('Total');

    const duracoes: number[] = [];
    let aprovacoes = 0;
    let reprovacoes = 0;
    let naFila = 0;
    let maiorEspera: number | null = null;
    const agora = Date.now();

    for (const envio of lista) {
      let linhaCurso = cursos.get(envio.curso);
      if (!linhaCurso) {
        linhaCurso = linhaVazia(envio.curso);
        cursos.set(envio.curso, linhaCurso);
      }

      const ano = new Date(envio.enviadoEm).getFullYear();
      let linhaAno = anos.get(ano);
      if (!linhaAno) {
        linhaAno = linhaVazia(String(ano));
        anos.set(ano, linhaAno);
      }

      contar(linhaCurso, envio.status);
      contar(linhaAno, envio.status);
      contar(total, envio.status);

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
        const espera = agora - new Date(dataUltimoEnvio(envio)).getTime();
        maiorEspera = maiorEspera === null ? espera : Math.max(maiorEspera, espera);
      }
    }

    const decididas = aprovacoes + reprovacoes;

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
      porCurso: [...cursos.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
      porAno: [...anos.entries()].sort((a, b) => b[0] - a[0]).map(([, linha]) => linha),
      total,
    };
  }
}