export const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral'] as const;

export const STATUS = [
  'Em análise',
  'Ajustes solicitados',
  'Aprovado',
  'Reprovado',
  'Removido',
] as const;
export type StatusEnvio = (typeof STATUS)[number];

export const DECISOES = ['aprovado', 'reprovado', 'ajustes'] as const;
export type Decisao = (typeof DECISOES)[number];

export type TipoEvento =
  | Decisao
  | 'enviado'
  | 'reenviado'
  | 'editado'
  | 'removido'
  | 'restaurado';

export const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB