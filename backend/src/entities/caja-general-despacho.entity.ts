import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TipoCajaGeneral = 'ingreso' | 'egreso' | 'inicio' | 'cuadre';

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

  @CreateDateColumn()
  created_at: Date;
}
