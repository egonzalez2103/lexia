import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TipoRegistroMovimiento = 'ingreso' | 'egreso';
export type FormaPagoMovimiento = 'efectivo' | 'transferencia' | 'deposito' | 'tarjeta';

@Entity('registros_movimiento')
@Index(['despacho_id', 'created_at'])
export class RegistroMovimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  tipo_movimiento_id: number;

  @Column()
  corresponde_usuario_id: number;

  @Column()
  usuario_id: number;

  @Column({ length: 16 })
  tipo: TipoRegistroMovimiento;

  @Column({ length: 20 })
  forma_pago: FormaPagoMovimiento;

  @Column({ type: 'int', nullable: true })
  cuenta_bancaria_id: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ length: 255 })
  descripcion: string;

  @Column({ default: true })
  afecta_operacion: boolean;

  @Column({ type: 'int', nullable: true })
  caja_movimiento_id: number | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
