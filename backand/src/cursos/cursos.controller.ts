import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AtividadesService } from '../atividades/atividades.service.js';
import { Papeis } from '../auth/papeis.decorator.js';
import { Publico } from '../auth/publico.decorator.js';
import { UsuarioAtual } from '../auth/usuario-atual.decorator.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CursosService } from './cursos.service.js';
import { CriarCursoDto } from './dto/criar-curso.dto.js';

@Controller('cursos')
export class CursosController {
  constructor(
    private readonly cursos: CursosService,
    private readonly atividades: AtividadesService,
  ) {}

  // Aberta: a tela de cadastro precisa da lista antes de a pessoa entrar
  @Publico()
  @Get()
  listar() {
    return this.cursos.listar();
  }

  @Papeis('admin')
  @Get('uso')
  uso() {
    return this.cursos.uso();
  }

  @Papeis('admin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post()
  async criar(@UsuarioAtual() admin: Usuario, @Body() dto: CriarCursoDto) {
    const curso = await this.cursos.adicionar(dto.nome);
    await this.atividades.registrar(admin.nome, 'Curso cadastrado', curso.nome);
    return curso;
  }

  @Papeis('admin')
  @HttpCode(204)
  @Delete(':id')
  async remover(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const nome = await this.cursos.remover(id);
    await this.atividades.registrar(admin.nome, 'Curso removido', nome);
  }
}