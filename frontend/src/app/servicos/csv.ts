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

/** Baixa o texto como arquivo. Só funciona no navegador. */
export function baixarCsv(nomeArquivo: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}