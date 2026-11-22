import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('promociones')
export class Promocion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  juzgado: string | null;

  @Column({ type: 'date' })
  presentada_el: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  archivo_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
