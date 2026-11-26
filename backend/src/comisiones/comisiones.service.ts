import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { BitacoraEdicion } from '../entities/bitacora-edicion.entity';
import { Cliente } from '../entities/cliente.entity';
import { Comision } from '../entities/comision.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { ComisionDto, GenerarCorteDto, PagarVariasDto } from './dto';

@Injectable()
export class ComisionesService {
  constructor(
    @InjectRepository(Comision) private readonly comisiones: Repository<Comision>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MovimientoDespacho) private readonly movimientos: Repository<MovimientoDespacho>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(BitacoraEdicion) private readonly bitacoraRows: Repository<BitacoraEdicion>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen(user: AuthUser, despachoId?: number, desde?: string, hasta?: string, usuarioId?: number, estado?: string) {
    const despacho = await this.alcance.despachoDe(user, 'comisiones', despachoId);
    const admin = this.alcance.esAdmin(user);
    const semana = semanaDe(hoy());
    let inicio = esYmd(desde) ? desde : semana.inicio;
    let fin = esYmd(hasta) ? hasta : semana.fin;
    if (inicio > fin) {
      const tmp = inicio;
      inicio = fin;
      fin = tmp;
    }
    const filtroEstado = estado === 'pendiente' || estado === 'pagada' ? estado : undefined;
    const gente = await this.users.find({ where: { despacho_id: despacho.id }, order: { name: 'ASC' } });
    const activos = gente.filter((persona) => persona.activo !== false);
    const abogadoId = admin ? (usuarioId && gente.some((persona) => persona.id === usuarioId) ? usuarioId : undefined) : user.id;

    const ingresos = await this.movimientos.find({
      where: {
        despacho_id: despacho.id,
        tipo: 'ingreso',
        estado: 'aplicado',
        fecha: Between(inicio, fin),
        ...(abogadoId ? { usuario_id: abogadoId } : {}),
      },
      order: { fecha: 'DESC', id: 'DESC' },
    });
    const lineas = await this.comisiones.find({
      where: {
        despacho_id: despacho.id,
        fecha: Between(inicio, fin),
        ...(abogadoId ? { usuario_id: abogadoId } : {}),
        ...(filtroEstado ? { estado: filtroEstado } : {}),
      },
      order: { fecha: 'DESC', id: 'DESC' },
    });

    const cobradores = await this.cobradoresDe(
      despacho.id,
      ingresos.map((row) => row.id),
    );
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    const cobradorIds = [
      ...new Set(
        [
          ...lineas.map((row) => row.cobrador_usuario_id),
          ...[...cobradores.values()].map((row) => row.id),
        ].filter((id): id is number => id != null && !nombres.has(id)),
      ),
    ];
    if (cobradorIds.length) {
      const extras = await this.users.find({ where: { id: In(cobradorIds) } });
      for (const persona of extras) nombres.set(persona.id, persona.name);
    }
    const clienteIds = [
      ...new Set(
        [...ingresos.map((row) => row.cliente_id), ...lineas.map((row) => row.cliente_id)].filter((id): id is number => id != null),
      ),
    ];
    const clientes = clienteIds.length
      ? await this.clientes.find({ where: { despacho_id: despacho.id, id: In(clienteIds) } })
      : [];
    const clienteNombre = new Map(clientes.map((cliente) => [cliente.id, nombreCliente(cliente)]));

    const filas = ingresos.map((row) => {
      const cobro = cobradores.get(row.id);
      return {
        id: row.id,
        concepto: row.concepto,
        abogado_id: row.usuario_id,
        abogado: nombres.get(row.usuario_id) ?? 'Usuario',
        cobrador: cobro ? (cobro.id ? (nombres.get(cobro.id) ?? cobro.nombre) : cobro.nombre) : '—',
        cliente: row.cliente_id ? (clienteNombre.get(row.cliente_id) ?? '—') : '—',
        monto: money(row.monto),
        fecha: dia(row.fecha),
        tipo: 'Ingreso',
        despacho: despacho.name,
      };
    });

    const gruposMapa = new Map<number, { usuario_id: number; nombre: string; total: number; pendiente: number; lineas: LineaVista[] }>();
    for (const row of lineas) {
      const grupo = gruposMapa.get(row.usuario_id) ?? {
        usuario_id: row.usuario_id,
        nombre: nombres.get(row.usuario_id) ?? 'Usuario',
        total: 0,
        pendiente: 0,
        lineas: [],
      };
      const comision = money(row.monto);
      grupo.total = centavos(grupo.total + comision);
      if (row.estado === 'pendiente') grupo.pendiente = centavos(grupo.pendiente + comision);
      const cobradorId = row.cobrador_usuario_id;
      grupo.lineas.push({
        id: row.id,
        concepto: row.concepto,
        cliente: row.cliente_id ? (clienteNombre.get(row.cliente_id) ?? '—') : '—',
        fecha: dia(row.fecha),
        cobrador: cobradorId ? (nombres.get(cobradorId) ?? '—') : '—',
        tipo_movimiento: row.movimiento_id ? 'Ingreso' : 'Ajuste',
        despacho: despacho.name,
        porcentaje: row.porcentaje == null ? null : money(row.porcentaje),
        pagado: money(row.monto_base ?? row.monto),
        comision,
        tipo: row.tipo_linea === 'normal' ? 'Normal' : 'Ajuste',
        estado: row.estado,
      });
      gruposMapa.set(row.usuario_id, grupo);
    }
    const grupos = [...gruposMapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const comision = centavos(grupos.reduce((total, grupo) => total + grupo.total, 0));
    const pendiente = centavos(grupos.reduce((total, grupo) => total + grupo.pendiente, 0));
    const conCliente = centavos(filas.filter((fila) => fila.cliente !== '—').reduce((total, fila) => total + fila.monto, 0));
    const pagado = centavos(filas.reduce((total, fila) => total + fila.monto, 0));

    return {
      despacho_id: despacho.id,
      despacho: despacho.name,
      es_admin: admin,
      desde: inicio,
      hasta: fin,
      totales: {
        comision,
        pendiente,
        pagada: centavos(comision - pendiente),
        abogados: grupos.length,
        lineas: lineas.length,
      },
      datos: {
        pagado,
        con_cliente: conCliente,
        sin_cliente: centavos(pagado - conCliente),
        ingresos: filas.length,
      },
      abogados: (admin ? activos : activos.filter((persona) => persona.id === user.id)).map((persona) => ({
        id: persona.id,
        name: persona.name,
      })),
      grupos,
      filas,
    };
  }

  async generar(user: AuthUser, dto: GenerarCorteDto) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('Solo la administración genera el corte de comisiones.');
    const despacho = await this.alcance.despachoDe(user, 'comisiones', dto.despacho_id, 'insertar');
    const semana = semanaDe(dto.fecha);
    const porcentaje = centavos(dto.porcentaje ?? 10);
    const ingresos = await this.movimientos.find({
      where: {
        despacho_id: despacho.id,
        tipo: 'ingreso',
        estado: 'aplicado',
        fecha: Between(semana.inicio, semana.fin),
      },
    });
    const cobradores = await this.cobradoresDe(
      despacho.id,
      ingresos.map((row) => row.id),
    );
    const nombres = new Map(
      (await this.users.find({ where: { despacho_id: despacho.id } })).map((persona) => [persona.id, persona.name]),
    );

    let creadas = 0;
    await this.comisiones.manager.transaction(async (manager) => {
      const ids = ingresos.map((row) => row.id);
      const ya = ids.length
        ? await manager.find(Comision, { where: { movimiento_id: In(ids) } })
        : [];
      const existentes = new Set(ya.map((row) => row.movimiento_id));
      for (const ingreso of ingresos) {
        const base = money(ingreso.monto);
        if (base <= 0 || existentes.has(ingreso.id)) continue;
        const comision = centavos((base * porcentaje) / 100);
        const cobro = cobradores.get(ingreso.id);
        const row = await manager.save(
          Comision,
          manager.create(Comision, {
            despacho_id: despacho.id,
            usuario_id: ingreso.usuario_id,
            concepto: ingreso.concepto,
            monto: comision.toFixed(2),
            fecha: dia(ingreso.fecha),
            estado: 'pendiente',
            notas: null,
            movimiento_id: ingreso.id,
            cliente_id: ingreso.cliente_id,
            cobrador_usuario_id: cobro?.id ?? null,
            monto_base: base.toFixed(2),
            porcentaje: porcentaje.toFixed(2),
            tipo_linea: 'normal',
          }),
        );
        await this.bitacora.registrar(
          {
            despachoId: despacho.id,
            entidad: 'Comision',
            entidadId: row.id,
            referencia: row.concepto,
            tipo: 'alta',
            campos: altaDe({
              Abogado: nombres.get(ingreso.usuario_id) ?? 'Usuario',
              Concepto: row.concepto,
              Pagado: row.monto_base,
              Porcentaje: `${porcentaje.toFixed(2)}%`,
              Comision: row.monto,
            }),
            actor: user,
          },
          manager,
        );
        creadas += 1;
      }
    });

    return { lineas_creadas: creadas, semana_inicio: semana.inicio, semana_fin: semana.fin };
  }

  async pagarVarias(user: AuthUser, dto: PagarVariasDto) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('Solo la administración marca una comisión como pagada.');
    const despacho = await this.alcance.despachoDe(user, 'comisiones', dto.despacho_id, 'insertar');
    const ids = [...new Set(dto.ids)];
    let pagadas = 0;
    await this.comisiones.manager.transaction(async (manager) => {
      const rows = await manager.find(Comision, { where: { despacho_id: despacho.id, id: In(ids) } });
      if (rows.length !== ids.length) throw new NotFoundException('No encontramos esas comisiones.');
      const pendientes = rows.filter((row) => row.estado === 'pendiente');
      const abogados = new Set(pendientes.map((row) => row.usuario_id));
      if (abogados.size > 1) throw new BadRequestException('Paga a un solo abogado a la vez.');
      for (const row of pendientes) {
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
        pagadas += 1;
      }
    });
    return { pagadas };
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
          movimiento_id: null,
          cliente_id: null,
          cobrador_usuario_id: null,
          monto_base: monto.toFixed(2),
          porcentaje: null,
          tipo_linea: 'ajuste',
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

  private async cobradoresDe(despachoId: number, movimientoIds: number[]) {
    const mapa = new Map<number, { id: number | null; nombre: string }>();
    if (!movimientoIds.length) return mapa;
    const notas = await this.bitacoraRows.find({
      where: {
        despacho_id: despachoId,
        entidad: 'MovimientoDespacho',
        tipo_cambio: 'alta',
        entidad_id: In(movimientoIds),
      },
    });
    for (const nota of notas) mapa.set(nota.entidad_id, { id: nota.usuario_id, nombre: nota.usuario });
    return mapa;
  }
}

type LineaVista = {
  id: number;
  concepto: string;
  cliente: string;
  fecha: string;
  cobrador: string;
  tipo_movimiento: string;
  despacho: string;
  porcentaje: number | null;
  pagado: number;
  comision: number;
  tipo: string;
  estado: 'pendiente' | 'pagada';
};

function nombreCliente(cliente: { nombre: string; paterno: string | null; materno: string | null }) {
  return [cliente.nombre, cliente.paterno, cliente.materno].filter(Boolean).join(' ');
}

function esYmd(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function dia(value: string | Date | null | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0) {
    return ymdUtc(value);
  }
  return ymd(value);
}

function semanaDe(iso: string) {
  const [anio, mes, diaMes] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, diaMes);
  fecha.setDate(fecha.getDate() - ((fecha.getDay() - 5 + 7) % 7));
  const inicio = ymd(fecha);
  fecha.setDate(fecha.getDate() + 6);
  return { inicio, fin: ymd(fecha) };
}

function ymd(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function ymdUtc(fecha: Date) {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
}
