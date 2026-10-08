import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { E_PUBLICO } from './publico.decorator.js';
import type { RequisicaoAutenticada } from './requisicao-autenticada.js';

/** Exige login em todas as rotas, menos nas marcadas com @Publico(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(E_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) return true;

    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [tipo, token] = (requisicao.headers.authorization ?? '').split(' ');

    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Faça login para continuar.');
    }

    try {
      const dados = await this.jwt.verifyAsync<{ sub: string; v: number }>(token);

      // O perfil e a situação da conta vêm do banco, não do token
      const usuario = await this.repo.findOne({ where: { id: dados.sub } });
      if (!usuario || !usuario.ativo) throw new Error('Conta indisponível');

      // Perfil, remoção ou senha mudaram depois do login: a sessão antiga não vale mais
      if (dados.v !== usuario.sessaoVersao) throw new Error('Sessão revogada');

      requisicao.usuario = usuario;
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada. Entre novamente.');
    }
  }
}