import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, paraResposta } from './auth.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { DefinirSenhaDto } from './dto/definir-senha.dto.js';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Publico } from './publico.decorator.js';
import type { RequisicaoAutenticada } from './requisicao-autenticada.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('cadastro')
  cadastrar(@Body() dto: CadastroDto) {
    return this.auth.cadastrar(dto);
  }

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @Post('login')
  entrar(@Body() dto: LoginDto) {
    return this.auth.entrar(dto);
  }

  @Publico()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(200)
  @Post('esqueci-senha')
  esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.auth.esqueciSenha(dto);
  }

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @Post('definir-senha')
  definirSenha(@Body() dto: DefinirSenhaDto) {
    return this.auth.definirSenha(dto);
  }

  @Get('eu')
  eu(@Req() requisicao: RequisicaoAutenticada) {
    return paraResposta(requisicao.usuario!);
  }
}