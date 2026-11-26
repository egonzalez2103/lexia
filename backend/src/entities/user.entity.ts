import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FuncionDespacho } from '../common/auth';
import { UserRole } from '../common/enums';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 160 })
  name: string;

  @Column({ unique: true, length: 160 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'int', nullable: true })
  despacho_id: number | null;

  @Column({ type: 'varchar', length: 80, unique: true, nullable: true })
  username: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', nullable: true })
  grupo_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  funcion: FuncionDespacho | null;

  @Column({ type: 'int', nullable: true })
  sede_id: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
