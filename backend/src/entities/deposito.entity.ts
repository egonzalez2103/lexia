import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoDeposito = 'pendiente' | 'autorizado' | 'rechazado';

@Entity('depositos')
@Index(['despacho_id', 'estado'])
export class Deposito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  cliente_id: number;

  @Column({ type: 'int', nullable: true })
  asunto_id: number | null;

  @Column({ type: 'int', nullable: true })
  cuenta_bancaria_id: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  referencia: string | null;

  @Column({ length: 20, default: 'pendiente' })
  estado: EstadoDeposito;

  @Column({ type: 'varchar', length: 240, nullable: true })
  motivo: string | null;

  @Column({ type: 'int', nullable: true })
  abono_id: number | null;

  @CreateDateColumn()
  created_at: Date;
}
