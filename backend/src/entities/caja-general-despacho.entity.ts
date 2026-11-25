import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TipoCajaGeneral = 'ingreso' | 'egreso' | 'inicio' | 'cuadre';
export type OrigenCajaGeneral = 'manual' | 'registro' | 'inicio' | 'cuadre';

@Entity('caja_general_despacho')
@Index(['despacho_id', 'fecha'])
export class CajaGeneralDespacho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 16 })
  tipo: TipoCajaGeneral;

  @Column({ length: 180 })
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'int', nullable: true })
  tipo_movimiento_id: number | null;

  @Column({ type: 'int', nullable: true })
  corresponde_usuario_id: number | null;

  @Column({ type: 'int', nullable: true })
  usuario_id: number | null;

  @Column({ type: 'int', nullable: true })
  cuenta_bancaria_id: number | null;

  @Column({ type: 'int', nullable: true })
  registro_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  forma_pago: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ default: true })
  afecta_operacion: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ length: 16, default: 'manual' })
  origen: OrigenCajaGeneral;

  @CreateDateColumn()
  created_at: Date;
}
