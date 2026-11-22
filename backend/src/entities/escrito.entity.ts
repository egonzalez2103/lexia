import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('escritos')
export class Escrito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  cuerpo: string | null;

  @Column({ length: 20, default: 'borrador' })
  estado: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  archivo_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
