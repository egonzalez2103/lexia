import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cortes_caja')
export class CorteCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 16 })
  caja: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldo_contado: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
