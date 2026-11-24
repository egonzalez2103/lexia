import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TipoCambio = 'alta' | 'edicion' | 'baja';

export type CampoEdicion = {
  anterior: unknown;
  nuevo: unknown;
};

@Entity('bitacora_ediciones')
@Index(['despacho_id', 'fecha'])
@Index(['entidad', 'fecha'])
export class BitacoraEdicion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  despacho_id: number | null;

  @Column({ length: 40 })
  entidad: string;

  @Column()
  entidad_id: number;

  @Column({ length: 180 })
  referencia: string;

  @Column({ length: 16 })
  tipo_cambio: TipoCambio;

  @Column({ type: 'json' })
  campos: Record<string, CampoEdicion>;

  @Column({ type: 'int', nullable: true })
  usuario_id: number | null;

  @Column({ length: 160 })
  usuario: string;

  @CreateDateColumn()
  fecha: Date;
}
