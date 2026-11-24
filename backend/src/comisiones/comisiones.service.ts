import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { Comision } from '../entities/comision.entity';
import { User } from '../entities/user.entity';
import { ComisionDto } from './dto';

@Injectable()
export class ComisionesService {
  constructor(
    @InjectRepository(Comision) private readonly comisiones: Repository<Comision>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen(user: AuthUser, despachoId?: number) {
    const despacho = await this.alcance.despachoDe(user, 'comisiones', despachoId);
    const admin = this.alcance.esAdmin(user);
    const [rows, todos] = await Promise.all([
      this.comisiones.find({
        where: admin ? { despacho_id: despacho.id } : { despacho_id: despacho.id, usuario_id: user.id },
        order: { id: 'DESC' },
      }),
      this.users.find({ where: { despacho_id: despacho.id }, order: { name: 'ASC' } }),
    ]);
    const gente = todos.filter((persona) => persona.activo !== false);
    const nombres = new Map(todos.map((persona) => [persona.id, persona.name]));
    const lista = rows.map((row) => ({
      id: row.id,
      usuario_id: row.usuario_id,
      usuario: nombres.get(row.usuario_id) ?? 'Usuario',
      concepto: row.concepto,
      monto: money(row.monto),
      fecha: String(row.fecha).slice(0, 10),
      estado: row.estado,
      notas: row.notas,
    }));
    const pendiente = centavos(lista.filter((row) => row.estado === 'pendiente').reduce((total, row) => total + row.monto, 0));
    const pagada = centavos(lista.filter((row) => row.estado === 'pagada').reduce((total, row) => total + row.monto, 0));
    return {
      despacho_id: despacho.id,
      es_admin: admin,
      pendiente,
      pagada,
      usuarios: gente.map((persona) => ({ id: persona.id, name: persona.name })),
      comisiones: lista,
    };
  }

  async create(user: AuthUser, dto: ComisionDto) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('Solo la administración registra comisiones.');
    const despacho = await this.alcance.despachoDe(user, 'comisiones', dto.despacho_id, 'insertar');
    const abogado = await this.users.findOne({ where: { id: dto.usuario_id, despacho_id: despacho.id, activo: true } });
    if (!abogado) throw new NotFoundException('Esa persona no pertenece al despacho.');
    const monto = centavos(dto.monto);
    await this.comisiones.manager.transaction(async (manager) => {
      const row = await manager.save(
        Comision,
        manager.create(Comision, {
          despacho_id: despacho.id,
          usuario_id: abogado.id,
          concepto: dto.concepto.trim(),
          monto: monto.toFixed(2),
          fecha: hoy(),
          estado: 'pendiente',
          notas: dto.notas?.trim() || null,
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'Comision',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'alta',
          campos: altaDe({ Abogado: abogado.name, Concepto: row.concepto, Monto: row.monto }),
          actor: user,
        },
        manager,
      );
    });
    return this.resumen(user, despacho.id);
  }

  async pagar(user: AuthUser, id: number, despachoId?: number) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('Solo la administración marca una comisión como pagada.');
    const despacho = await this.alcance.despachoDe(user, 'comisiones', despachoId, 'insertar');
    await this.comisiones.manager.transaction(async (manager) => {
      const row = await manager.findOne(Comision, { where: { id, despacho_id: despacho.id } });
      if (!row) throw new NotFoundException('No encontramos esa comisión.');
      if (row.estado !== 'pendiente') return;
      row.estado = 'pagada';
      await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'Comision',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'edicion',
          campos: { Estado: { anterior: 'Pendiente', nuevo: 'Pagada' } },
          actor: user,
        },
        manager,
      );
    });
    return this.resumen(user, despacho.id);
  }
}
