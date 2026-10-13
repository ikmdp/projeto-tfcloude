import { Controller, Get, Query } from '@nestjs/common';
import { Papeis } from '../auth/papeis.decorator.js';
import { AtividadesService } from './atividades.service.js';
import { ConsultaAtividadesDto } from './dto/consulta-atividades.dto.js';

@Papeis('admin')
@Controller('atividades')
export class AtividadesController {
  constructor(private readonly atividades: AtividadesService) {}

  @Get()
  listar(@Query() consulta: ConsultaAtividadesDto) {
    return this.atividades.listar(consulta);
  }
}