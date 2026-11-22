import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('aplicaciones')
export class Aplicacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40, unique: true })
  clave: string;

  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 160 })
  descripcion: string;

  @Column({ length: 40 })
  categoria: string;
}
