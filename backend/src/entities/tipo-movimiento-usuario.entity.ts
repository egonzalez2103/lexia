import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipo_movimiento_usuarios')
export class TipoMovimientoUsuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tipo_id: number;

  @Column()
  usuario_id: number;
}
