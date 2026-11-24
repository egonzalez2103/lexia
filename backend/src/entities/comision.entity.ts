import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoComision = 'pendiente' | 'pagada';

@Entity('comisiones')
@Index(['despacho_id', 'usuario_id'])
export class Comision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  usuario_id: number;

  @Column({ length: 180 })
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 16, default: 'pendiente' })
  estado: EstadoComision;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
