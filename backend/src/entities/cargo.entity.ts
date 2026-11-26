import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cargos')
@Index(['despacho_id', 'cliente_id'])
export class Cargo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  cliente_id: number;

  @Column()
  asunto_id: number;

  @Column({ length: 180 })
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'date', nullable: true })
  vence_el: string | null;

  @CreateDateColumn()
  created_at: Date;
}
