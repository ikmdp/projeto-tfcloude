import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtividadesModule } from '../atividades/atividades.module.js';
import { CursosModule } from '../cursos/cursos.module.js';
import { Envio } from '../envios/envio.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { RelatoriosController } from './relatorios.controller.js';
import { RelatoriosService } from './relatorios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Envio, Usuario]), CursosModule, AtividadesModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}