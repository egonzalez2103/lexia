import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('terminos')
export class Termino {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ type: 'date' })
  vence_el: string;

  @Column({ length: 20, default: 'pendiente' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
