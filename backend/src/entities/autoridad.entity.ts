import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('autoridades')
@Index(['despacho_id', 'nombre'])
export class Autoridad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 180 })
  nombre: string;

  @Column({ type: 'int', nullable: true })
  materia_id: number | null;

  @Column({ type: 'int', nullable: true })
  instancia_id: number | null;

  @CreateDateColumn()
  created_at: Date;
}
