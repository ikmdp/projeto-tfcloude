/** Tira espaços sobrando do começo, do fim e do meio. */
export const limparTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** E-mail sempre em minúsculas e sem espaços. */
export const emailMinusculo = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;