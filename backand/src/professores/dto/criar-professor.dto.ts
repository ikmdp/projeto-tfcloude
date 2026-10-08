import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { emailMinusculo, limparTexto } from '../../auth/dto/transformacoes.js';

export class CriarProfessorDto {
  @Transform(limparTexto)
  @IsString({ message: 'Informe o nome do professor(a).' })
  @MinLength(3, { message: 'O nome precisa ter pelo menos 3 letras.' })
  @MaxLength(80, { message: 'O nome pode ter no máximo 80 caracteres.' })
  nome: string;

  @Transform(emailMinusculo)
  @IsEmail({}, { message: 'Digite um e-mail válido.' })
  @MaxLength(120, { message: 'O e-mail pode ter no máximo 120 caracteres.' })
  email: string;
}