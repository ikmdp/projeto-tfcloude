import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AcervoController } from './acervo.controller.js';
import { ArmazenamentoService } from './armazenamento.service.js';
import { Envio } from './envio.entity.js';
import { EnviosController } from './envios.controller.js';
import { EnviosService } from './envios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Envio]), UsuariosModule],
  controllers: [EnviosController, AcervoController],
  providers: [EnviosService, ArmazenamentoService],
})
export class EnviosModule {}