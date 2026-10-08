import { createHash, randomBytes } from 'node:crypto';

/** Token aleatório de 256 bits, em 64 caracteres hexadecimais. */
export function gerarToken(): string {
  return randomBytes(32).toString('hex');
}

/** O que vai para o banco: o hash, nunca o token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}