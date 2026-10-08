import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { emailMinusculo } from './transformacoes.js';

export class LoginDto {
  @Transform(emailMinusculo)
  @IsEmail({}, { message: 'Digite um e-mail válido.' })
  @MaxLength(120, { message: 'Digite um e-mail válido.' })
  email: string;

  @IsString({ message: 'Informe a senha.' })
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(72, { message: 'E-mail ou senha incorretos.' })
  senha: string;

  @IsOptional()
  @IsBoolean({ message: 'Valor inválido.' })
  lembrar?: boolean;
}