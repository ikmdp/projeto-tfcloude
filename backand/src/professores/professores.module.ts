import { Module } from '@nestjs/common';
import { AtividadesModule } from '../atividades/atividades.module.js';
import { EmailModule } from '../email/email.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ProfessoresController } from './professores.controller.js';
import { ProfessoresService } from './professor.service.js';
@Module({
  imports: [UsuariosModule, EmailModule, AtividadesModule],
  controllers: [ProfessoresController],
  providers: [ProfessoresService],
})
export class ProfessoresModule {} 