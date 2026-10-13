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
import { UsuarioAtual } from '../auth/usuario-atual.decorator.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CriarProfessorDto } from './dto/criar-professor.dto.js';
import { ProfessoresService } from './professor.service.js';

// Tudo aqui é só para a coordenação
@Papeis('admin')
@Controller('professores')
export class ProfessoresController {
  constructor(
    private readonly professores: ProfessoresService,
    private readonly atividades: AtividadesService,
  ) {}

  @Get()
  listar() {
    return this.professores.listar();
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  async cadastrar(@UsuarioAtual() admin: Usuario, @Body() dto: CriarProfessorDto) {
    const resultado = await this.professores.cadastrar(dto);
    await this.atividades.registrar(
      admin.nome,
      'Professor cadastrado',
      `${resultado.professor.nome} · ${resultado.professor.email}`,
    );
    return resultado;
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @Post(':id/reenviar-convite')
  async reenviarConvite(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const resultado = await this.professores.reenviarConvite(id);
    await this.atividades.registrar(
      admin.nome,
      'Convite reenviado',
      `${resultado.professor.nome} · ${resultado.professor.email}`,
    );
    return resultado;
  }

  @HttpCode(204)
  @Delete(':id')
  async remover(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const removido = await this.professores.remover(id);
    await this.atividades.registrar(
      admin.nome,
      'Professor removido',
      `${removido.nome} · ${removido.email}`,
    );
  }
}