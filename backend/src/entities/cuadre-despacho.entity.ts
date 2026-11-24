import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cuadres_despacho')
export class CuadreDespacho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @CreateDateColumn()
  created_at: Date;
}
