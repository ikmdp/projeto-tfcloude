import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { limparTexto } from '../../auth/dto/transformacoes.js';
import { DECISOES, type Decisao } from '../constantes.js';

export class DecisaoDto {
  @IsIn(DECISOES, { message: 'Decisão inválida.' })
  decisao: Decisao;

  // Obrigatório para pedir ajustes ou reprovar. Ao aprovar, é ignorado.
  @ValidateIf((dto: DecisaoDto) => dto.decisao !== 'aprovado')
  @Transform(limparTexto)
  @IsString({ message: 'Descreva o motivo (mínimo de 10 caracteres).' })
  @MinLength(10, { message: 'Descreva o motivo (mínimo de 10 caracteres).' })
  @MaxLength(1000, { message: 'O motivo pode ter no máximo 1000 caracteres.' })
  motivo?: string;
}