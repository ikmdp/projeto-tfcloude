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
import { Papeis } from '../auth/papeis.decorator.js';
import { CriarProfessorDto } from './dto/criar-professor.dto.js';
import { ProfessoresService } from './professor.service.js';

// Tudo aqui é só para a coordenação
@Papeis('admin')
@Controller('professores')
export class ProfessoresController {
  constructor(private readonly professores: ProfessoresService) {}

  @Get()
  listar() {
    return this.professores.listar();
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  cadastrar(@Body() dto: CriarProfessorDto) {
    return this.professores.cadastrar(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @Post(':id/reenviar-convite')
  reenviarConvite(@Param('id', ParseUUIDPipe) id: string) {
    return this.professores.reenviarConvite(id);
  }

  @HttpCode(204)
  @Delete(':id')
  async remover(@Param('id', ParseUUIDPipe) id: string) {
    await this.professores.remover(id);
  }
}