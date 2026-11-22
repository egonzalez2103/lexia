import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { money } from '../common/slug';
import { Colaborador } from '../entities/colaborador.entity';
import { Despacho } from '../entities/despacho.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoCaja } from '../entities/movimiento-caja.entity';
import { NominaPago } from '../entities/nomina-pago.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    @InjectRepository(Colaborador) private readonly colaboradores: Repository<Colaborador>,
    @InjectRepository(MovimientoCaja) private readonly movimientos: Repository<MovimientoCaja>,
    @InjectRepository(NominaPago) private readonly pagosNomina: Repository<NominaPago>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
  ) {}

  async resumen() {
    const [despachos, colaboradores, movimientos, pagosNomina, expedientes] = await Promise.all([
      this.despachos.find(),
      this.colaboradores.find(),
      this.movimientos.find(),
      this.pagosNomina.find(),
      this.expedientes.count(),
    ]);
    const saldo = (caja: string) =>
      movimientos
        .filter((row) => row.caja === caja)
        .reduce((total, row) => total + (row.tipo === 'ingreso' ? money(row.monto) : -money(row.monto)), 0);
    const periodo = currentMonday();
    const fin = sundayOf(periodo);
    const deLaSemana = pagosNomina.filter((row) => row.semana_inicio === periodo);
    const pagadoDe = new Map<number, number>();
    for (const pago of deLaSemana) {
      pagadoDe.set(pago.colaborador_id, (pagadoDe.get(pago.colaborador_id) ?? 0) + money(pago.monto));
    }
    const enNomina = colaboradores.filter(
      (row) => row.activo && row.tiene_nomina !== false && String(row.fecha_ingreso).slice(0, 10) <= fin,
    );
    return {
      despachos_activos: despachos.filter((row) => row.is_active).length,
      despachos_suspendidos: despachos.filter((row) => !row.is_active).length,
      colaboradores_activos: colaboradores.filter((row) => row.activo).length,
      saldo_chica: saldo('chica'),
      saldo_general: saldo('general'),
      nominas_borrador: enNomina.filter((row) => (pagadoDe.get(row.id) ?? 0) + 0.005 < money(row.salario_semanal)).length,
      nominas_pagadas_semana: enNomina.filter((row) => money(row.salario_semanal) > 0 && (pagadoDe.get(row.id) ?? 0) + 0.005 >= money(row.salario_semanal)).length,
      monto_nominas_semana: deLaSemana.reduce((total, row) => total + money(row.monto), 0),
      expedientes,
    };
  }
}

function sundayOf(monday: string) {
  const [year, month, day] = monday.split('-').map(Number);
  const end = new Date(year, month - 1, day + 6);
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  return `${end.getFullYear()}-${endMonth}-${endDay}`;
}

function currentMonday() {
  const today = new Date();
  const day = today.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta);
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${monday.getFullYear()}-${month}-${date}`;
}
