import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipos_movimiento_despacho')
export class TipoMovimientoDespacho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 180 })
  nombre: string;

  @Column({ default: true })
  afecta_operacion: boolean;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
