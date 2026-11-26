import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('asuntos')
@Index(['despacho_id', 'cliente_id'])
export class Asunto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  cliente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_acordado: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  esquema: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
