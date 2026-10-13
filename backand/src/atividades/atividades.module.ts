import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Atividade } from './atividade.entity.js';
import { AtividadesController } from './atividades.controller.js';
import { AtividadesService } from './atividades.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Atividade])],
  controllers: [AtividadesController],
  providers: [AtividadesService],
  exports: [AtividadesService],
})
export class AtividadesModule {}