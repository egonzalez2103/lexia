import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { CuadreDespacho } from '../entities/cuadre-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { hastaPorUsuario, saldoCaja, saldoUsuario, tieneCajaAbierta } from '../movimientos/saldos';
import { CajaGeneralDto, CuadreDto } from './dto';

@Injectable()
export class CajaGeneralService {
  constructor(
    @InjectRepository(CajaGeneralDespacho) private readonly movimientos: Repository<CajaGeneralDespacho>,
    @InjectRepository(CorteDespacho) private readonly cortes: Repository<CorteDespacho>,
    @InjectRepository(CuadreDespacho) private readonly cuadres: Repository<CuadreDespacho>,
    @InjectRepository(MovimientoDespacho) private readonly libros: Repository<MovimientoDespacho>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen(user: AuthUser, despachoId?: number) {
    const despacho = await this.firma(user, despachoId, 'ver');
    return this.presentar(despacho.id);
  }

  async mover(user: AuthUser, dto: CajaGeneralDto) {
    const despacho = await this.firma(user, dto.despacho_id, 'insertar');
    const monto = this.monto(dto.monto);
    const row = await this.movimientos.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const rows = await manager.find(CajaGeneralDespacho, { where: { despacho_id: despacho.id } });
      if (dto.tipo === 'egreso' && saldoCaja(rows) + 0.001 < monto) {
        throw new BadRequestException('La caja general no alcanza para ese egreso.');
      }
      const row = await manager.save(
        CajaGeneralDespacho,
        manager.create(CajaGeneralDespacho, {
          despacho_id: despacho.id,
          tipo: dto.tipo,
          concepto: dto.concepto.trim(),
          monto: monto.toFixed(2),
          fecha: hoy(),
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'CajaGeneral',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'alta',
          campos: altaDe({ Tipo: dto.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', Concepto: row.concepto, Monto: row.monto }),
          actor: user,
        },
        manager,
      );
      return row;
    });
    return this.presentar(despacho.id);
  }

  async cuadrar(user: AuthUser, dto: CuadreDto) {
    const despacho = await this.firma(user, dto.despacho_id, 'insertar');
    await this.movimientos.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const [cortes, movs, gente] = await Promise.all([
        manager.find(CorteDespacho, { where: { despacho_id: despacho.id, cuadre_id: IsNull() }, order: { id: 'ASC' } }),
        manager.find(MovimientoDespacho, { where: { despacho_id: despacho.id } }),
        manager.find(User, { where: { despacho_id: despacho.id } }),
      ]);
      const hasta = hastaPorUsuario(await manager.find(CorteDespacho, { where: { despacho_id: despacho.id } }));
      const pendientes = gente.filter((persona) => tieneCajaAbierta(movs, persona.id, hasta.get(persona.id) ?? 0));
      if (pendientes.length) {
        throw new BadRequestException(`Falta el corte de ${pendientes.map((persona) => persona.name).join(', ')}.`);
      }
      if (!cortes.length) throw new BadRequestException('No hay cortes pendientes de pasar a caja general.');
      const monto = centavos(cortes.reduce((total, corte) => total + money(corte.total), 0));
      const row = await manager.save(
        CuadreDespacho,
        manager.create(CuadreDespacho, { despacho_id: despacho.id, fecha: hoy(), monto: monto.toFixed(2) }),
      );
      for (const corte of cortes) {
        corte.cuadre_id = row.id;
        await manager.save(corte);
      }
      if (monto > 0) {
        await manager.save(
          CajaGeneralDespacho,
          manager.create(CajaGeneralDespacho, {
            despacho_id: despacho.id,
            tipo: 'cuadre',
            concepto: `Cuadre de caja chica ${hoy()}`,
            monto: monto.toFixed(2),
            fecha: hoy(),
          }),
        );
      }
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'CuadreCaja',
          entidadId: row.id,
          referencia: `Cuadre ${row.fecha}`,
          tipo: 'alta',
          campos: altaDe({ Fecha: row.fecha, Monto: row.monto }),
          actor: user,
        },
        manager,
      );
      return row;
    });
    return this.presentar(despacho.id);
  }

  private async firma(user: AuthUser, despachoId: number | undefined, accion: 'ver' | 'insertar') {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('La caja general la opera la administración del despacho.');
    return this.alcance.despachoDe(user, 'caja-general', despachoId, accion);
  }

  private async presentar(despachoId: number) {
    const [movimientos, cortes, movs, gente] = await Promise.all([
      this.movimientos.find({ where: { despacho_id: despachoId }, order: { id: 'DESC' } }),
      this.cortes.find({ where: { despacho_id: despachoId, cuadre_id: IsNull() }, order: { id: 'DESC' } }),
      this.libros.find({ where: { despacho_id: despachoId } }),
      this.users.find({ where: { despacho_id: despachoId } }),
    ]);
    const hasta = hastaPorUsuario(await this.cortes.find({ where: { despacho_id: despachoId } }));
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    return {
      despacho_id: despachoId,
      saldo_general: saldoCaja(movimientos),
      saldo_chica: centavos(cortes.reduce((total, corte) => total + money(corte.total), 0)),
      pendientes_corte: gente
        .filter((persona) => tieneCajaAbierta(movs, persona.id, hasta.get(persona.id) ?? 0))
        .map((persona) => ({ id: persona.id, name: persona.name, saldo: saldoUsuario(movs, persona.id, hasta.get(persona.id) ?? 0).responsable })),
      cortes: cortes.map((corte) => ({
        id: corte.id,
        usuario: nombres.get(corte.usuario_id) ?? 'Usuario',
        fecha: String(corte.fecha).slice(0, 10),
        total: money(corte.total),
      })),
      movimientos: movimientos.map((row) => ({
        id: row.id,
        tipo: row.tipo,
        concepto: row.concepto,
        monto: money(row.monto),
        fecha: String(row.fecha).slice(0, 10),
      })),
    };
  }

  private monto(value: number) {
    const monto = centavos(value);
    if (monto < 0.01) throw new BadRequestException('El monto tiene que ser mayor a cero.');
    return monto;
  }
}
