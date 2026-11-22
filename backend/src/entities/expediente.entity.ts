import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('expedientes')
export class Expediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ length: 160 })
  cliente: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  juzgado: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  materia: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
