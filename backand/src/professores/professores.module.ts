import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ProfessoresController } from './professores.controller.js';
import { ProfessoresService } from './professor.service.js';

@Module({
  imports: [UsuariosModule, EmailModule],
  controllers: [ProfessoresController],
  providers: [ProfessoresService],
})
export class ProfessoresModule {}