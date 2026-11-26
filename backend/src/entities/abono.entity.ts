import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MedioAbono = 'efectivo' | 'transferencia' | 'otro';

@Entity('abonos')
@Index(['despacho_id', 'cliente_id'])
export class Abono {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  cliente_id: number;

  @Column({ type: 'int', nullable: true })
  asunto_id: number | null;

  @Column({ type: 'int', nullable: true })
  cargo_id: number | null;

  @Column({ length: 180 })
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ length: 20 })
  medio: MedioAbono;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'int', nullable: true })
  movimiento_id: number | null;

  @CreateDateColumn()
  created_at: Date;
}
