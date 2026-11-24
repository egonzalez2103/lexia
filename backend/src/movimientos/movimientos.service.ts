import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { Cliente } from '../entities/cliente.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { CorteDto, InicioDto, MovimientoDto, TransferenciaDto } from './dto';
import { hastaPorUsuario, involucra, saldoCaja, saldoUsuario, tieneCajaAbierta } from './saldos';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(MovimientoDespacho) private readonly movimientos: Repository<MovimientoDespacho>,
    @InjectRepository(CorteDespacho) private readonly cortes: Repository<CorteDespacho>,
    @InjectRepository(CajaGeneralDespacho) private readonly general: Repository<CajaGeneralDespacho>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen(user: AuthUser, despachoId?: number, usuarioId?: number) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', despachoId);
    const gente = await this.usuariosDe(despacho.id);
    const [movs, cortes, clientes] = await Promise.all([
      this.movimientos.find({ where: { despacho_id: despacho.id }, order: { id: 'DESC' } }),
      this.cortes.find({ where: { despacho_id: despacho.id }, order: { id: 'DESC' } }),
      this.clientes.find({ where: { despacho_id: despacho.id, activo: true }, order: { nombre: 'ASC' } }),
    ]);
    const admin = this.alcance.esAdmin(user);
    const hasta = hastaPorUsuario(cortes);
    const operadores = gente.filter(
      (persona) => persona.activo !== false || tieneCajaAbierta(movs, persona.id, hasta.get(persona.id) ?? 0),
    );
    const foco = await this.foco(user, gente, usuarioId);
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    const saldo = saldoUsuario(movs, foco.id, hasta.get(foco.id) ?? 0);
    const base = admin ? operadores : operadores.filter((persona) => persona.activo !== false || persona.id === user.id);
    const visibles = base.some((persona) => persona.id === foco.id) ? base : [foco, ...base];
    return {
      despacho_id: despacho.id,
      fecha: hoy(),
      es_admin: admin,
      usuario_id: foco.id,
      saldo,
      usuarios: visibles.map((persona) => {
        const verSaldo = admin || persona.id === user.id;
        const libro = verSaldo ? saldoUsuario(movs, persona.id, hasta.get(persona.id) ?? 0) : null;
        return {
          id: persona.id,
          name: persona.name,
          activo: persona.activo !== false,
          responsable: libro?.responsable ?? null,
          disponible: libro?.disponible ?? null,
          debe_corte: verSaldo ? tieneCajaAbierta(movs, persona.id, hasta.get(persona.id) ?? 0) : false,
        };
      }),
      clientes: clientes.map((cliente) => ({ id: cliente.id, nombre: nombreCliente(cliente) })),
      movimientos: movs
        .filter((mov) => mov.id > (hasta.get(foco.id) ?? 0) && involucra(mov, foco.id))
        .map((mov) => this.presentar(mov, nombres)),
      pendientes: movs
        .filter((mov) => mov.tipo === 'transferencia' && mov.estado === 'pendiente' && (this.alcance.esAdmin(user) || involucra(mov, user.id)))
        .map((mov) => this.presentar(mov, nombres)),
    };
  }

  async iniciar(user: AuthUser, dto: InicioDto) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('Solo la administración del despacho entrega inicios.');
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const monto = this.monto(dto.monto);
    const destino = await this.usuarioDe(despacho.id, dto.usuario_id);
    const mov = await this.movimientos.manager.transaction(async (manager) => {
      await this.bloquear(manager, despacho.id);
      const saldo = await this.saldoGeneral(manager, despacho.id);
      if (saldo + 0.001 < monto) {
        throw new BadRequestException('La caja general no alcanza para ese inicio. Primero registra un ingreso en caja general.');
      }
      const row = await manager.save(
        MovimientoDespacho,
        manager.create(MovimientoDespacho, {
          despacho_id: despacho.id,
          usuario_id: destino.id,
          tipo: 'inicio',
          estado: 'aplicado',
          concepto: (dto.concepto?.trim() || `Inicio de caja`).slice(0, 180),
          monto: monto.toFixed(2),
          fecha: hoy(),
          contraparte_usuario_id: null,
          cliente_id: null,
          notas: null,
        }),
      );
      await manager.save(
        CajaGeneralDespacho,
        manager.create(CajaGeneralDespacho, {
          despacho_id: despacho.id,
          tipo: 'inicio',
          concepto: `Inicio para ${destino.name}`.slice(0, 180),
          monto: monto.toFixed(2),
          fecha: hoy(),
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'MovimientoDespacho',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'alta',
          campos: altaDe({ Usuario: destino.name, Tipo: 'Inicio', Monto: row.monto }),
          actor: user,
        },
        manager,
      );
      return row;
    });
    return this.resumen(user, despacho.id, destino.id);
  }

  async ingresar(user: AuthUser, dto: MovimientoDto) {
    return this.mover(user, dto, 'ingreso');
  }

  async egresar(user: AuthUser, dto: MovimientoDto) {
    return this.mover(user, dto, 'egreso');
  }

  async transferir(user: AuthUser, dto: TransferenciaDto) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const monto = this.monto(dto.monto);
    const gente = await this.usuariosDe(despacho.id);
    const origen = await this.foco(user, gente, dto.usuario_id);
    const destino = gente.find((persona) => persona.id === dto.contraparte_usuario_id);
    if (!destino || destino.activo === false) throw new NotFoundException('Esa persona no pertenece al despacho.');
    if (destino.id === origen.id) throw new BadRequestException('La transferencia tiene que ser a otra persona.');
    const mov = await this.movimientos.manager.transaction(async (manager) => {
      await this.bloquear(manager, despacho.id);
      const libro = await this.libro(manager, despacho.id, origen.id);
      if (libro.disponible + 0.001 < monto) throw new BadRequestException('No hay saldo disponible para esa transferencia.');
      const row = await manager.save(
        MovimientoDespacho,
        manager.create(MovimientoDespacho, {
          despacho_id: despacho.id,
          usuario_id: origen.id,
          tipo: 'transferencia',
          estado: 'pendiente',
          concepto: (dto.concepto?.trim() || `Transferencia a ${destino.name}`).slice(0, 180),
          monto: monto.toFixed(2),
          fecha: hoy(),
          contraparte_usuario_id: destino.id,
          cliente_id: null,
          notas: null,
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'MovimientoDespacho',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'alta',
          campos: altaDe({ De: origen.name, Para: destino.name, Monto: row.monto, Estado: 'Pendiente' }),
          actor: user,
        },
        manager,
      );
      return row;
    });
    return this.resumen(user, despacho.id, origen.id);
  }

  async aceptar(user: AuthUser, id: number, despachoId?: number) {
    return this.resolver(user, id, despachoId, 'aplicado');
  }

  async rechazar(user: AuthUser, id: number, despachoId?: number) {
    return this.resolver(user, id, despachoId, 'rechazado');
  }

  async cortar(user: AuthUser, dto: CorteDto) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const gente = await this.usuariosDe(despacho.id);
    const foco = await this.foco(user, gente, dto.usuario_id);
    await this.movimientos.manager.transaction(async (manager) => {
      await this.bloquear(manager, despacho.id);
      const movs = await manager.find(MovimientoDespacho, { where: { despacho_id: despacho.id }, order: { id: 'ASC' } });
      const ultimo = await manager.findOne(CorteDespacho, { where: { despacho_id: despacho.id, usuario_id: foco.id }, order: { id: 'DESC' } });
      const hasta = ultimo?.hasta_movimiento_id ?? 0;
      if (movs.some((mov) => mov.tipo === 'transferencia' && mov.estado === 'pendiente' && involucra(mov, foco.id))) {
        throw new BadRequestException('Hay una transferencia pendiente. Acéptala o recházala antes del corte.');
      }
      const saldo = saldoUsuario(movs, foco.id, hasta);
      const abiertos = movs.filter((mov) => mov.id > hasta && mov.estado === 'aplicado' && involucra(mov, foco.id));
      if (!abiertos.length) throw new BadRequestException('No hay movimientos por cortar.');
      const maxId = movs.reduce((max, mov) => Math.max(max, mov.id), 0);
      const corte = await manager.save(
        CorteDespacho,
        manager.create(CorteDespacho, {
          despacho_id: despacho.id,
          usuario_id: foco.id,
          fecha: hoy(),
          inicio: saldo.inicio.toFixed(2),
          ingresos: saldo.ingresos.toFixed(2),
          egresos: saldo.egresos.toFixed(2),
          total: saldo.responsable.toFixed(2),
          hasta_movimiento_id: maxId,
          cuadre_id: null,
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'CorteDespacho',
          entidadId: corte.id,
          referencia: `Corte de ${foco.name}`,
          tipo: 'alta',
          campos: altaDe({ Usuario: foco.name, Inicio: corte.inicio, Ingresos: corte.ingresos, Egresos: corte.egresos, Total: corte.total }),
          actor: user,
        },
        manager,
      );
    });
    return this.resumen(user, despacho.id, foco.id);
  }

  private async mover(user: AuthUser, dto: MovimientoDto, tipo: 'ingreso' | 'egreso') {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const monto = this.monto(dto.monto);
    const gente = await this.usuariosDe(despacho.id);
    const foco = await this.foco(user, gente, dto.usuario_id);
    const cliente = dto.cliente_id ? await this.clienteDe(despacho.id, dto.cliente_id) : null;
    const mov = await this.movimientos.manager.transaction(async (manager) => {
      await this.bloquear(manager, despacho.id);
      if (tipo === 'egreso') {
        const libro = await this.libro(manager, despacho.id, foco.id);
        if (libro.disponible + 0.001 < monto) throw new BadRequestException('El egreso es mayor que el saldo disponible.');
      }
      const row = await manager.save(
        MovimientoDespacho,
        manager.create(MovimientoDespacho, {
          despacho_id: despacho.id,
          usuario_id: foco.id,
          tipo,
          estado: 'aplicado',
          concepto: dto.concepto.trim(),
          monto: monto.toFixed(2),
          fecha: hoy(),
          contraparte_usuario_id: null,
          cliente_id: cliente?.id ?? null,
          notas: dto.notas?.trim() || null,
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'MovimientoDespacho',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'alta',
          campos: altaDe({
            Usuario: foco.name,
            Tipo: tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
            Concepto: row.concepto,
            Monto: row.monto,
            Cliente: cliente ? nombreCliente(cliente) : null,
          }),
          actor: user,
        },
        manager,
      );
      return row;
    });
    return this.resumen(user, despacho.id, foco.id);
  }

  private async resolver(user: AuthUser, id: number, despachoId: number | undefined, estado: 'aplicado' | 'rechazado') {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', despachoId, 'insertar');
    const mov = await this.movimientos.manager.transaction(async (manager) => {
      await this.bloquear(manager, despacho.id);
      const row = await manager.findOne(MovimientoDespacho, { where: { id, despacho_id: despacho.id } });
      if (!row || row.tipo !== 'transferencia') throw new NotFoundException('No encontramos esa transferencia.');
      if (row.estado !== 'pendiente') throw new BadRequestException('Esa transferencia ya fue resuelta.');
      const puede = this.alcance.esAdmin(user) || user.id === row.contraparte_usuario_id || (estado === 'rechazado' && user.id === row.usuario_id);
      if (!puede) throw new ForbiddenException('Solo quien recibe puede aceptar la transferencia.');
      row.estado = estado;
      const guardado = await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'MovimientoDespacho',
          entidadId: guardado.id,
          referencia: guardado.concepto,
          tipo: 'edicion',
          campos: { Estado: { anterior: 'Pendiente', nuevo: estado === 'aplicado' ? 'Aceptada' : 'Rechazada' } },
          actor: user,
        },
        manager,
      );
      return guardado;
    });
    return this.resumen(user, despacho.id, mov.usuario_id);
  }

  private async libro(manager: EntityManager, despachoId: number, usuarioId: number) {
    const [movs, corte] = await Promise.all([
      manager.find(MovimientoDespacho, { where: { despacho_id: despachoId } }),
      manager.findOne(CorteDespacho, { where: { despacho_id: despachoId, usuario_id: usuarioId }, order: { id: 'DESC' } }),
    ]);
    return saldoUsuario(movs, usuarioId, corte?.hasta_movimiento_id ?? 0);
  }

  private async saldoGeneral(manager: EntityManager, despachoId: number) {
    const rows = await manager.find(CajaGeneralDespacho, { where: { despacho_id: despachoId } });
    return saldoCaja(rows);
  }

  private async bloquear(manager: EntityManager, despachoId: number) {
    await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despachoId]);
  }

  private async usuariosDe(despachoId: number) {
    return this.users.find({ where: { despacho_id: despachoId }, order: { name: 'ASC' } });
  }

  private async usuarioDe(despachoId: number, id: number) {
    const user = await this.users.findOne({ where: { id, despacho_id: despachoId, activo: true } });
    if (!user) throw new NotFoundException('Esa persona no pertenece al despacho.');
    return user;
  }

  private async foco(user: AuthUser, gente: User[], usuarioId?: number) {
    if (!this.alcance.esAdmin(user)) {
      const propio = gente.find((persona) => persona.id === user.id);
      if (!propio) throw new ForbiddenException('Tu usuario no opera la caja de este despacho.');
      return propio;
    }
    if (!usuarioId) {
      const propio = gente.find((persona) => persona.id === user.id);
      if (propio) return propio;
      const activo = gente.find((persona) => persona.activo !== false);
      if (activo) return activo;
      if (!gente.length) throw new BadRequestException('El despacho no tiene usuarios para operar la caja.');
      return gente[0];
    }
    const elegido = gente.find((persona) => persona.id === usuarioId);
    if (!elegido) throw new NotFoundException('Esa persona no pertenece al despacho.');
    return elegido;
  }

  private async clienteDe(despachoId: number, id: number) {
    const cliente = await this.clientes.findOne({ where: { id, despacho_id: despachoId, activo: true } });
    if (!cliente) throw new NotFoundException('No encontramos ese cliente en el despacho.');
    return cliente;
  }

  private monto(value: number) {
    const monto = centavos(value);
    if (monto < 0.01) throw new BadRequestException('El monto tiene que ser mayor a cero.');
    return monto;
  }

  private presentar(mov: MovimientoDespacho, nombres: Map<number, string>) {
    return {
      id: mov.id,
      usuario_id: mov.usuario_id,
      usuario: nombres.get(mov.usuario_id) ?? 'Usuario',
      contraparte_usuario_id: mov.contraparte_usuario_id,
      contraparte: mov.contraparte_usuario_id ? (nombres.get(mov.contraparte_usuario_id) ?? 'Usuario') : null,
      tipo: mov.tipo,
      estado: mov.estado,
      concepto: mov.concepto,
      monto: money(mov.monto),
      fecha: String(mov.fecha).slice(0, 10),
      cliente_id: mov.cliente_id,
      notas: mov.notas,
    };
  }
}

function nombreCliente(cliente: Cliente) {
  return [cliente.nombre, cliente.paterno, cliente.materno].filter(Boolean).join(' ');
}
