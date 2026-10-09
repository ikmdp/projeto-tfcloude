import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConsultaAcervoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'A busca pode ter no máximo 100 caracteres.' })
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Curso inválido.' })
  curso?: string;
}