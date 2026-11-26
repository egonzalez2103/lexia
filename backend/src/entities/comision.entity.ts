import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoComision = 'pendiente' | 'pagada';
export type TipoLineaComision = 'normal' | 'ajuste';

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

  @Column({ type: 'int', nullable: true, unique: true })
  movimiento_id: number | null;

  @Column({ type: 'int', nullable: true })
  cliente_id: number | null;

  @Column({ type: 'int', nullable: true })
  cobrador_usuario_id: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_base: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  porcentaje: string | null;

  @Column({ length: 16, default: 'ajuste' })
  tipo_linea: TipoLineaComision;

  @CreateDateColumn()
  created_at: Date;
}
