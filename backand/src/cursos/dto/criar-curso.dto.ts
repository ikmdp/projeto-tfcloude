import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { limparTexto } from '../../auth/dto/transformacoes.js';

export class CriarCursoDto {
  @Transform(limparTexto)
  @IsString({ message: 'Informe o nome do curso.' })
  @MinLength(2, { message: 'O nome do curso precisa ter pelo menos 2 letras.' })
  @MaxLength(60, { message: 'O nome pode ter no máximo 60 caracteres.' })
  nome: string;
}