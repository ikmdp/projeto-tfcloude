/**
 * Aceita uma lista de textos vinda como JSON (formulário com arquivo) ou como lista de verdade
 * (corpo JSON). Tira espaços sobrando e descarta itens vazios.
 */
export const lerLista = ({ value }: { value: unknown }) => {
  let lista: unknown = value;

  if (typeof value === 'string') {
    try {
      lista = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(lista)) return undefined;

  return lista
    .map((item) => (typeof item === 'string' ? item.trim().replace(/\s+/g, ' ') : item))
    .filter((item) => item !== '');
};