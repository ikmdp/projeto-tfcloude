import { Injectable, inject } from '@angular/core';
import { Envios } from './envios';

export interface Trabalho {
  id: string;
  titulo: string;
  autor: string;
  curso: string;
  ano: number;
  tamanho?: number; // em bytes
  palavrasChave: string[];
  orientador?: string;
  turma?: string;
  turno?: string;
}

// Trabalhos de exemplo (os do design). Quando o backend existir, saem daqui.
const EXEMPLOS: Trabalho[] = [
  {
    id: 'ex-1',
    titulo: 'Sistema de monitoramento de energia solar residencial',
    autor: 'Beatriz Lima',
    curso: 'Eletrotécnica',
    ano: 2025,
    tamanho: 4404019,
    palavrasChave: ['energia solar', 'monitoramento', 'sensores'],
  },
  {
    id: 'ex-2',
    titulo: 'Aplicativo de gestão de estoque para pequenas oficinas',
    autor: 'Rafael Costa',
    curso: 'Informática',
    ano: 2025,
    tamanho: 3250585,
    palavrasChave: ['aplicativo', 'estoque', 'gestão'],
  },
  {
    id: 'ex-3',
    titulo: 'Redução de perdas em cadeia de frio para laticínios',
    autor: 'Marina Duarte',
    curso: 'Logística',
    ano: 2024,
    tamanho: 5872026,
    palavrasChave: ['cadeia de frio', 'laticínios', 'perdas'],
  },
  {
    id: 'ex-4',
    titulo: 'Manutenção preditiva em motores industriais',
    autor: 'Lucas Teixeira',
    curso: 'Mecânica',
    ano: 2024,
    tamanho: 2936013,
    palavrasChave: ['manutenção', 'motores', 'indústria'],
  },
];

@Injectable({ providedIn: 'root' })
export class AcervoDados {
  private envios = inject(Envios);

  /** Aprovados do sistema + exemplos, do ano mais novo para o mais antigo. */
  listar(): Trabalho[] {
    const aprovados: Trabalho[] = this.envios.listarAprovados().map((e) => ({
      id: e.id,
      titulo: e.titulo,
      autor: e.autor,
      curso: e.curso,
      ano: new Date(e.enviadoEm).getFullYear(),
      tamanho: e.arquivoTamanho,
      palavrasChave: e.palavrasChave ?? [],
      orientador: e.orientador,
      turma: e.turma,
      turno: e.turno,
    }));

    return [...aprovados, ...EXEMPLOS].sort((a, b) => b.ano - a.ano);
  }
}