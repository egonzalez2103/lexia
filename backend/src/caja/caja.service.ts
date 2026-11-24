import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { CorteCaja } from '../entities/corte-caja.entity';
import { MovimientoCaja } from '../entities/movimiento-caja.entity';
import { CreateCorteDto, CreateMovimientoDto } from './dto';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(MovimientoCaja) private readonly movimientos: Repository<MovimientoCaja>,
    @InjectRepository(CorteCaja) private readonly cortes: Repository<CorteCaja>,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen() {
    const [movimientos, cortes] = await Promise.all([
      this.movimientos.find({ order: { fecha: 'DESC', id: 'DESC' } }),
      this.cortes.find({ order: { fecha: 'DESC', id: 'DESC' } }),
    ]);
    return {
      saldos: {
        chica: this.saldo(movimientos, 'chica'),
        general: this.saldo(movimientos, 'general'),
      },
      movimientos: movimientos.map((row) => ({ ...row, monto: money(row.monto) })),
      cortes: cortes.map((row) => ({ ...row, saldo_contado: money(row.saldo_contado) })),
    };
  }

  async mover(dto: CreateMovimientoDto, actor: AuthUser) {
    const row = await this.movimientos.save(
      this.movimientos.create({
        caja: dto.caja,
        tipo: dto.tipo,
        concepto: dto.concepto.trim(),
        monto: dto.monto.toFixed(2),
        fecha: dto.fecha.slice(0, 10),
      }),
    );
    await this.bitacora.registrar({
      despachoId: null,
      entidad: 'MovimientoCaja',
      entidadId: row.id,
      referencia: row.concepto,
      tipo: 'alta',
      campos: altaDe({
        Caja: row.caja === 'chica' ? 'Caja chica' : 'Caja general',
        Tipo: row.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        Concepto: row.concepto,
        Monto: row.monto,
        Fecha: row.fecha,
      }),
      actor,
    });
    return { ...row, monto: money(row.monto) };
  }

  async cortar(dto: CreateCorteDto, actor: AuthUser) {
    const row = await this.cortes.save(
      this.cortes.create({
        caja: dto.caja,
        fecha: dto.fecha.slice(0, 10),
        saldo_contado: dto.saldo_contado.toFixed(2),
        notas: dto.notas?.trim() || null,
      }),
    );
    await this.bitacora.registrar({
      despachoId: null,
      entidad: 'CorteCaja',
      entidadId: row.id,
      referencia: `Corte de ${row.caja === 'chica' ? 'caja chica' : 'caja general'}`,
      tipo: 'alta',
      campos: altaDe({
        Caja: row.caja === 'chica' ? 'Caja chica' : 'Caja general',
        Fecha: row.fecha,
        'Saldo contado': row.saldo_contado,
        Notas: row.notas,
      }),
      actor,
    });
    return { ...row, saldo_contado: money(row.saldo_contado) };
  }

  private saldo(rows: MovimientoCaja[], caja: string) {
    return rows
      .filter((row) => row.caja === caja)
      .reduce((total, row) => total + (row.tipo === 'ingreso' ? money(row.monto) : -money(row.monto)), 0);
  }
}
