import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { StatusEnvio, TipoEvento } from './constantes.js';

export interface EventoEnvio {
  tipo: TipoEvento;
  em: string; // data em formato ISO
  por: string;
  motivo?: string;
}

@Entity('envios')
export class Envio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'simple-json' })
  alunos: string[];

  @Column({ type: 'varchar', length: 30 })
  turma: string;

  @Column({ type: 'varchar', length: 20 })
  turno: string;

  @Column({ type: 'varchar', length: 60 })
  curso: string;

  @Column({ type: 'simple-json' })
  palavrasChave: string[];

  @Column({ type: 'varchar', length: 36 })
  orientadorId: string;

  @Column({ type: 'varchar', length: 80 })
  orientadorNome: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  enviadoPorId: string;

  @Column({ type: 'varchar', length: 80 })
  enviadoPorNome: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  status: StatusEnvio;

  @Column({ type: 'integer', default: 1 })
  versao: number;

  // Motivo da última devolução, reprovação ou remoção
  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'simple-json' })
  historico: EventoEnvio[];

  // Nome do arquivo no disco: sempre um código gerado pelo servidor
  @Column({ type: 'varchar', length: 60 })
  arquivoChave: string;

  // Nome que a pessoa deu ao arquivo (só para exibir e baixar)
  @Column({ type: 'varchar', length: 200 })
  arquivoNome: string;

  @Column({ type: 'integer' })
  arquivoTamanho: number;

  @Column({ type: 'varchar', length: 64 })
  arquivoHash: string;

  // Data do envio mais recente (o original ou o último reenvio)
  @Column({ type: 'datetime' })
  ultimoEnvioEm: Date;

  // Sobe a cada alteração: impede que duas pessoas sobrescrevam uma à outra
  @Column({ type: 'integer', default: 0 })
  revisao: number;

  @CreateDateColumn()
  enviadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}