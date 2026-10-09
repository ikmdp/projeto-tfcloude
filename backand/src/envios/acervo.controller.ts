import { Controller, Get, Query } from '@nestjs/common';
import { ConsultaAcervoDto } from './dto/consulta-acervo.dto.js';
import { EnviosService } from './envios.service.js';

// Qualquer pessoa logada (aluno, professor ou coordenação) pode pesquisar o acervo
@Controller('acervo')
export class AcervoController {
  constructor(private readonly envios: EnviosService) {}

  @Get()
  listar(@Query() consulta: ConsultaAcervoDto) {
    return this.envios.acervo(consulta);
  }
}