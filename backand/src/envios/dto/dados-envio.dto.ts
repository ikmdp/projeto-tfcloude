import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { limparTexto } from '../../auth/dto/transformacoes.js';
import { TURNOS } from '../constantes.js';
import { lerLista } from './listas.js';

/** Dados do trabalho. Usado no envio, no reenvio e na edição pela coordenação. */
export class DadosEnvioDto {
  @Transform(limparTexto)
  @IsString({ message: 'Informe o título do trabalho.' })
  @MinLength(5, { message: 'O título precisa ter pelo menos 5 caracteres.' })
  @MaxLength(150, { message: 'O título pode ter no máximo 150 caracteres.' })
  titulo: string;

  @Transform(lerLista)
  @IsArray({ message: 'Informe os alunos autores do trabalho.' })
  @ArrayMinSize(1, { message: 'Informe o nome de pelo menos um aluno.' })
  @ArrayMaxSize(6, { message: 'O trabalho pode ter no máximo 6 alunos.' })
  @IsString({ each: true, message: 'Nome de aluno inválido.' })
  @MinLength(3, { each: true, message: 'Cada nome de aluno precisa ter pelo menos 3 letras.' })
  @MaxLength(80, { each: true, message: 'Cada nome de aluno pode ter no máximo 80 caracteres.' })
  alunos: string[];

  @Transform(limparTexto)
  @IsString({ message: 'Informe a turma (ex: 3º A).' })
  @MinLength(2, { message: 'Informe a turma (ex: 3º A).' })
  @MaxLength(30, { message: 'A turma pode ter no máximo 30 caracteres.' })
  turma: string;

  @IsIn(TURNOS, { message: 'Turno inválido.' })
  turno: string;

  @Transform(limparTexto)
  @IsString({ message: 'Informe o curso.' })
  @MinLength(2, { message: 'Informe o curso.' })
  @MaxLength(60, { message: 'O curso pode ter no máximo 60 caracteres.' })
  curso: string;

  @IsUUID(undefined, { message: 'Selecione o professor orientador(a).' })
  orientadorId: string;

  @Transform(lerLista)
  @IsArray({ message: 'Informe as palavras-chave.' })
  @ArrayMinSize(1, { message: 'Adicione pelo menos uma palavra-chave.' })
  @ArrayMaxSize(8, { message: 'Use no máximo 8 palavras-chave.' })
  @IsString({ each: true, message: 'Palavra-chave inválida.' })
  @MaxLength(40, { each: true, message: 'Cada palavra-chave pode ter no máximo 40 caracteres.' })
  palavrasChave: string[];
}