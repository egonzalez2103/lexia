import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TIPOS_CATALOGO = ['materia', 'jurisdiccion', 'instancia', 'estatus', 'sede'] as const;
export type TipoCatalogo = (typeof TIPOS_CATALOGO)[number];

@Entity('catalogos_juridicos')
@Index(['despacho_id', 'tipo', 'nombre'])
export class CatalogoJuridico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 20 })
  tipo: TipoCatalogo;

  @Column({ length: 160 })
  nombre: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  detalle: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @CreateDateColumn()
  created_at: Date;
}
