import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtividadesModule } from '../atividades/atividades.module.js';
import { Envio } from '../envios/envio.entity.js';
import { Curso } from './curso.entity.js';
import { CursosController } from './cursos.controller.js';
import { CursosService } from './cursos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, Envio]), AtividadesModule],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}