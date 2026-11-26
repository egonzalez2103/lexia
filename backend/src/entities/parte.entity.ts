import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('partes')
@Index(['expediente_id'])
export class Parte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @Column({ length: 180 })
  nombre: string;

  @Column({ length: 80 })
  caracter: string;

  @CreateDateColumn()
  created_at: Date;
}
