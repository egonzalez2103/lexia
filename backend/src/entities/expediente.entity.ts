import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('expedientes')
@Index(['despacho_id', 'cliente_id'])
@Index(['despacho_id', 'asunto_id'])
export class Expediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  folio: string | null;

  @Column({ length: 180 })
  titulo: string;

  @Column({ length: 160 })
  cliente: string;

  @Column({ type: 'int', nullable: true })
  cliente_id: number | null;

  @Column({ type: 'int', nullable: true })
  asunto_id: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  numero: string | null;

  @Column({ type: 'int', nullable: true })
  anio: number | null;

  @Column({ type: 'int', nullable: true })
  autoridad_id: number | null;

  @Column({ type: 'int', nullable: true })
  sede_id: number | null;

  @Column({ type: 'int', nullable: true })
  jurisdiccion_id: number | null;

  @Column({ type: 'int', nullable: true })
  materia_id: number | null;

  @Column({ type: 'int', nullable: true })
  instancia_id: number | null;

  @Column({ type: 'int', nullable: true })
  estatus_id: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  etapa: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  juzgado: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  materia: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
