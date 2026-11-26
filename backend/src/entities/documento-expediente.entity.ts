import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const CLASIFICACIONES = ['compartible', 'interno', 'privilegiado', 'sensible', 'reservado'] as const;
export type ClasificacionDocumento = (typeof CLASIFICACIONES)[number];

@Entity('documentos_expediente')
@Index(['expediente_id'])
export class DocumentoExpediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  titulo: string;

  @Column({ length: 20 })
  clasificacion: ClasificacionDocumento;

  @Column({ type: 'varchar', length: 500, nullable: true })
  archivo_url: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
