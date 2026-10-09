import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequisicaoAutenticada } from './requisicao-autenticada.js';

/** Entrega o usuário logado ao método do controller. Ex.: meus(@UsuarioAtual() usuario: Usuario) */
export const UsuarioAtual = createParamDecorator((_dados: unknown, contexto: ExecutionContext) => {
  return contexto.switchToHttp().getRequest<RequisicaoAutenticada>().usuario;
});