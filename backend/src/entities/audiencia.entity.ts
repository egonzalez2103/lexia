import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audiencias')
@Index(['despacho_id', 'fecha'])
export class Audiencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  hora: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  lugar: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
