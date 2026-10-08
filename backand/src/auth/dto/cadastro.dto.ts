import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { emailMinusculo, limparTexto } from './transformacoes.js';

export class CadastroDto {
  @Transform(limparTexto)
  @IsString({ message: 'Informe o nome completo.' })
  @MinLength(3, { message: 'O nome precisa ter pelo menos 3 letras.' })
  @MaxLength(80, { message: 'O nome pode ter no máximo 80 caracteres.' })
  nome: string;

  @Transform(emailMinusculo)
  @IsEmail({}, { message: 'Digite um e-mail válido.' })
  @MaxLength(120, { message: 'O e-mail pode ter no máximo 120 caracteres.' })
  email: string;

  @IsString({ message: 'Informe a senha.' })
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  senha: string;

  @IsOptional()
  @Transform(limparTexto)
  @IsString({ message: 'Curso inválido.' })
  @MinLength(2, { message: 'Curso inválido.' })
  @MaxLength(60, { message: 'Curso inválido.' })
  curso?: string;
}