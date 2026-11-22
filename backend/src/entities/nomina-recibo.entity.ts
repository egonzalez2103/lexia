import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('nominas_recibos')
@Unique(['semana_inicio', 'colaborador_id'])
export class NominaRecibo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  semana_inicio: string;

  @Column()
  colaborador_id: number;

  @Column({ length: 500 })
  archivo_url: string;
}
