import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { emailMinusculo } from './transformacoes.js';

export class EsqueciSenhaDto {
  @Transform(emailMinusculo)
  @IsEmail({}, { message: 'Digite um e-mail válido.' })
  @MaxLength(120, { message: 'Digite um e-mail válido.' })
  email: string;
}