import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cortes_despacho')
@Index(['despacho_id', 'usuario_id'])
export class CorteDespacho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  usuario_id: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  inicio: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  ingresos: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  egresos: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: string;

  @Column({ default: 0 })
  hasta_movimiento_id: number;

  @Column({ type: 'int', nullable: true })
  cuadre_id: number | null;

  @CreateDateColumn()
  created_at: Date;
}
