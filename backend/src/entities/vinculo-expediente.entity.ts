import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TIPOS_VINCULO = [
  'toca',
  'amparo_directo',
  'amparo_indirecto',
  'carpeta',
  'incidente',
  'causa',
  'cuaderno',
  'ejecucion',
  'otro',
] as const;
export type TipoVinculo = (typeof TIPOS_VINCULO)[number];

@Entity('vinculos_expediente')
@Index(['expediente_id', 'relacionado_id', 'tipo'])
export class VinculoExpediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @Column()
  relacionado_id: number;

  @Column({ length: 32 })
  tipo: TipoVinculo;

  @CreateDateColumn()
  created_at: Date;
}
