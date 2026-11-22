import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nominas_pagos')
export class NominaPago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  semana_inicio: string;

  @Column()
  colaborador_id: number;

  @Column({ length: 20 })
  forma_pago: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  descripcion: string | null;

  @Column({ type: 'date' })
  fecha: string;

  @CreateDateColumn()
  created_at: Date;
}
