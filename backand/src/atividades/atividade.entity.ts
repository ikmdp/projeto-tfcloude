import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('atividades')
export class Atividade {
  // Número crescente: dá a ordem exata, mesmo para ações no mesmo segundo
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @CreateDateColumn()
  em: Date;

  @Column({ type: 'varchar', length: 80 })
  por: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  acao: string;

  @Column({ type: 'varchar', length: 500 })
  detalhe: string;
}