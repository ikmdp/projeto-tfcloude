import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { limparTexto } from '../../auth/dto/transformacoes.js';

export class MotivoDto {
  @Transform(limparTexto)
  @IsString({ message: 'Informe o motivo (mínimo de 10 caracteres).' })
  @MinLength(10, { message: 'Informe o motivo (mínimo de 10 caracteres).' })
  @MaxLength(1000, { message: 'O motivo pode ter no máximo 1000 caracteres.' })
  motivo: string;
}