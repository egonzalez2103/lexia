import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TipoCliente = 'fisica' | 'moral';

@Entity('clientes')
@Index(['despacho_id', 'nombre'])
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 10 })
  tipo: TipoCliente;

  @Column({ length: 160 })
  nombre: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  paterno: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  materno: string | null;

  @Column({ type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  domicilio: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  correo: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
