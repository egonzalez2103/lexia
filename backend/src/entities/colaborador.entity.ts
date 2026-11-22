import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('colaboradores')
export class Colaborador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  paterno: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  materno: string | null;

  @Column({ length: 80 })
  puesto: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  correo: string | null;

  @Column({ type: 'date' })
  fecha_ingreso: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_semanal: string;

  @Column({ default: true })
  tiene_nomina: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', nullable: true })
  tipo_id: number | null;

  @Column({ type: 'int', nullable: true, unique: true })
  usuario_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
