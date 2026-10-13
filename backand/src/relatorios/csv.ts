const SEPARADOR = ';';

type Celula = string | number | undefined | null;

/** Evita que o Excel trate um texto digitado por alguém como fórmula. */
function proteger(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

function escapar(valor: Celula): string {
  const texto = proteger(String(valor ?? ''));
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Monta o texto do CSV, com ponto e vírgula e marca UTF-8 para o Excel ler os acentos. */
export function gerarCsv(linhas: Celula[][]): string {
  const corpo = linhas.map((linha) => linha.map(escapar).join(SEPARADOR)).join('\r\n');
  return `\uFEFF${corpo}\r\n`;
}