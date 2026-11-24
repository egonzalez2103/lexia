import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TipoMovimientoDespacho = 'inicio' | 'ingreso' | 'egreso' | 'transferencia';
export type EstadoMovimientoDespacho = 'aplicado' | 'pendiente' | 'rechazado';

@Entity('movimientos_despacho')
@Index(['despacho_id', 'usuario_id'])
export class MovimientoDespacho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  usuario_id: number;

  @Column({ length: 20 })
  tipo: TipoMovimientoDespacho;

  @Column({ length: 16, default: 'aplicado' })
  estado: EstadoMovimientoDespacho;

  @Column({ length: 180 })
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'int', nullable: true })
  contraparte_usuario_id: number | null;

  @Column({ type: 'int', nullable: true })
  cliente_id: number | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
