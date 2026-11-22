import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('grupo_permisos')
@Index(['grupo_id', 'aplicacion_id'], { unique: true })
export class GrupoPermiso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  grupo_id: number;

  @Column()
  aplicacion_id: number;

  @Column({ default: false })
  insertar: boolean;

  @Column({ default: false })
  actualizar: boolean;

  @Column({ default: false })
  eliminar: boolean;
}
