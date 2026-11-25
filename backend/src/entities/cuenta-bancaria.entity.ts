import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cuentas_bancarias')
export class CuentaBancaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  despacho_id: number;

  @Column({ length: 120 })
  banco: string;

  @Column({ length: 20 })
  numero: string;

  @Column({ length: 18 })
  clabe: string;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  created_at: Date;
}
