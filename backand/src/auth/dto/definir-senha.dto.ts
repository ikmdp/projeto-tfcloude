import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DefinirSenhaDto {
  @IsString({ message: 'Link inválido.' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'Link inválido.' })
  token: string;

  @IsString({ message: 'Informe a senha.' })
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  senha: string;
}