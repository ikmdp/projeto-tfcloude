import { IsIn, IsOptional } from 'class-validator';
import { STATUS, type StatusEnvio } from '../constantes.js';

export class FiltroStatusDto {
  @IsOptional()
  @IsIn(STATUS, { message: 'Situação inválida.' })
  status?: StatusEnvio;
}