import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tipos_colaborador')
export class TipoColaborador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  descripcion: string;

  @Column({ type: 'int', nullable: true, unique: true })
  grupo_id: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
