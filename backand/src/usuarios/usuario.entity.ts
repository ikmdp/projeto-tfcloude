import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type Papel = 'aluno' | 'professor' | 'admin';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  nome: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  papel: Papel;

  @Column({ type: 'varchar', length: 60, nullable: true })
  curso: string | null;

  // select: false => a senha nunca vem junto nas consultas comuns
  @Column({ type: 'varchar', nullable: true, select: false })
  senhaHash: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  // Quando a pessoa criou a própria senha. Vazio = convite ainda não usado.
  @Column({ type: 'datetime', nullable: true })
  ativadoEm: Date | null;

  // Guarda só o hash do link enviado por e-mail, nunca o link em si
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  tokenHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  tokenExpira: Date | null;

  // Muda quando o perfil ou a senha mudam: derruba as sessões antigas
  @Column({ type: 'integer', default: 0 })
  sessaoVersao: number;

  @CreateDateColumn()
  criadoEm: Date;
}