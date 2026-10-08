import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Papel } from '../usuarios/usuario.entity.js';
import { PAPEIS } from './papeis.decorator.js';
import type { RequisicaoAutenticada } from './requisicao-autenticada.js';

/** Só deixa passar quem tem um dos perfis pedidos em @Papeis(...). */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[]>(PAPEIS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!exigidos?.length) return true;

    const { usuario } = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    if (!usuario || !exigidos.includes(usuario.papel)) {
      throw new ForbiddenException('Você não tem permissão para acessar este recurso.');
    }
    return true;
  }
}