import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nominas_semana')
export class NominaSemana {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10, unique: true })
  semana_inicio: string;

  @Column({ length: 10 })
  semana_fin: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comprobante_url: string | null;
}
