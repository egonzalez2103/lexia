import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { CuadreDespacho } from '../entities/cuadre-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { RegistroMovimiento } from '../entities/registro-movimiento.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { hastaPorUsuario, saldoCaja, saldoUsuario, tieneCajaAbierta } from '../movimientos/saldos';
import { BajaCajaGeneralDto, CajaGeneralDto, CuadreDto } from './dto';

const FORMAS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  tarjeta: 'Tarjeta',
};

type Filtro = {
  despachoId?: number;
  q?: string;
  page: number;
  pageSize: number;
  ambito: 'operacion' | 'fuera';
  desde?: string;
  hasta?: string;
  fecha?: string;
  tipo?: 'ingreso' | 'egreso';
  formaPago?: 'efectivo' | 'transferencia' | 'deposito' | 'tarjeta';
  tipoId?: number;
  usuarioId?: number;
};

type Fila = {
  id: number;
  fecha: string;
  dia: string;
  despacho: string;
  tipo: string;
  clase: 'ingreso' | 'egreso';
  tipo_movimiento: string;
  tipo_movimiento_id: number | null;
  corresponde: string;
  corresponde_usuario_id: number | null;
  forma_pago: string;
  forma_pago_clave: string;
  monto: number;
  estado: string;
  usuario: string;
  descripcion: string;
  afecta_operacion: boolean;
  eliminable: boolean;
};

@Injectable()
export class CajaGeneralService {
  constructor(
    @InjectRepository(CajaGeneralDespacho) private readonly movimientos: Repository<CajaGeneralDespacho>,
    @InjectRepository(CorteDespacho) private readonly cortes: Repository<CorteDespacho>,
    @InjectRepository(CuadreDespacho) private readonly cuadres: Repository<CuadreDespacho>,
    @InjectRepository(MovimientoDespacho) private readonly libros: Repository<MovimientoDespacho>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TipoMovimientoDespacho) private readonly tipos: Repository<TipoMovimientoDespacho>,
    @InjectRepository(TipoMovimientoUsuario) private readonly alcances: Repository<TipoMovimientoUsuario>,
    @InjectRepository(CuentaBancaria) private readonly cuentas: Repository<CuentaBancaria>,
    @InjectRepository(RegistroMovimiento) private readonly registros: Repository<RegistroMovimiento>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(user: AuthUser, filtro: Filtro) {
    const despacho = await this.firma(user, filtro.despachoId, 'ver');
    const [todos, cortesAbiertos, todosCortes, cuadres, movs, gente, tipos, cuentas, registros] = await Promise.all([
      this.movimientos.find({ where: { despacho_id: despacho.id }, order: { id: 'DESC' } }),
      this.cortes.find({ where: { despacho_id: despacho.id, cuadre_id: IsNull() }, order: { id: 'DESC' } }),
      this.cortes.find({ where: { despacho_id: despacho.id } }),
      this.cuadres.find({ where: { despacho_id: despacho.id }, order: { fecha: 'DESC' } }),
      this.libros.find({ where: { despacho_id: despacho.id } }),
      this.users.find({ where: { despacho_id: despacho.id }, order: { name: 'ASC' } }),
      this.tipos.find({ where: { despacho_id: despacho.id }, order: { nombre: 'ASC' } }),
      this.cuentas.find({ where: { despacho_id: despacho.id, activa: true }, order: { banco: 'ASC' } }),
      this.registros.find({ where: { despacho_id: despacho.id, activo: true } }),
    ]);
    const marcas = tipos.length ? await this.alcances.find({ where: { tipo_id: In(tipos.map((tipo) => tipo.id)) } }) : [];
    const movimientos = todos.filter((row) => row.activo !== false);
    const autores = await this.nombresDe([
      ...movimientos.map((row) => row.usuario_id),
      ...movimientos.map((row) => row.corresponde_usuario_id),
      ...registros.map((row) => row.usuario_id),
      ...registros.map((row) => row.corresponde_usuario_id),
    ]);
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    for (const [id, nombre] of autores) nombres.set(id, nombres.get(id) ?? nombre);
    const tipoDe = new Map(tipos.map((tipo) => [tipo.id, tipo]));
    const porCaja = new Map(registros.filter((row) => row.caja_movimiento_id).map((row) => [row.caja_movimiento_id as number, row]));
    const porId = new Map(registros.map((row) => [row.id, row]));
    const vistos = movimientos.map((row) => this.presentar(row, despacho.name, nombres, tipoDe, porCaja, porId));
    const ultimo = cuadres[0] ? ymd(cuadres[0].fecha) : null;
    const ventana = ultimo ? diaSiguiente(ultimo) : null;
    const referencia = ymd(filtro.fecha) ?? hoy();
    let desde = ymd(filtro.desde);
    let hasta = ymd(filtro.hasta);
    if (!desde || !hasta) {
      desde = ventana && ventana <= referencia ? ventana : referencia;
      hasta = referencia;
    }
    if (desde > hasta) [desde, hasta] = [hasta, desde];
    const texto = filtro.q?.trim().toLocaleLowerCase('es-MX') ?? '';
    const filtrados = vistos.filter((fila) => coincide(fila, { ...filtro, texto, desde, hasta }));
    const operacion = filtrados.filter((fila) => fila.afecta_operacion);
    const fuera = filtrados.filter((fila) => !fila.afecta_operacion);
    const visibles = filtro.ambito === 'fuera' ? fuera : operacion;
    const paginaActual = pagina(visibles, filtro.page, filtro.pageSize);
    const suma = (clase: 'ingreso' | 'egreso') => centavos(visibles.filter((fila) => fila.clase === clase).reduce((total, fila) => total + fila.monto, 0));
    const hastaCorte = hastaPorUsuario(todosCortes);
    const activos = gente.filter((persona) => persona.activo !== false);
    return {
      despacho_id: despacho.id,
      despacho: despacho.name,
      saldo_general: saldoCaja(todos),
      saldo_chica: centavos(cortesAbiertos.reduce((total, corte) => total + money(corte.total), 0)),
      pendientes_corte: activos
        .filter((persona) => tieneCajaAbierta(movs, persona.id, hastaCorte.get(persona.id) ?? 0))
        .map((persona) => ({ id: persona.id, name: persona.name, saldo: saldoUsuario(movs, persona.id, hastaCorte.get(persona.id) ?? 0).responsable })),
      cortes: cortesAbiertos.map((corte) => ({
        id: corte.id,
        usuario: nombres.get(corte.usuario_id) ?? 'Usuario',
        fecha: ymd(corte.fecha),
        total: money(corte.total),
      })),
      ventana_desde: ventana,
      desde,
      hasta,
      ...paginaActual,
      total_operacion: operacion.length,
      total_fuera: fuera.length,
      suma_ingresos: suma('ingreso'),
      suma_egresos: suma('egreso'),
      es_admin: this.alcance.esAdmin(user),
      personas: activos.map((persona) => ({ id: persona.id, name: persona.name })),
      tipos: tipos
        .filter((tipo) => tipo.activo)
        .map((tipo) => ({
          id: tipo.id,
          nombre: tipo.nombre,
          afecta_operacion: tipo.afecta_operacion,
          usuario_ids: marcas.filter((marca) => marca.tipo_id === tipo.id).map((marca) => marca.usuario_id),
        })),
      cuentas: cuentas.map((cuenta) => ({ id: cuenta.id, banco: cuenta.banco, numero: cuenta.numero })),
    };
  }

  async mover(user: AuthUser, dto: CajaGeneralDto) {
    const despacho = await this.firma(user, dto.despacho_id, 'insertar');
    const persona = await this.personaDe(despacho.id, dto.usuario_id);
    const descripcion = dto.descripcion.replace(/\s+/g, ' ').trim();
    if (descripcion.length < 3) throw new BadRequestException('Describe el motivo del movimiento.');
    const monto = this.monto(dto.monto);
    const fecha = ymd(dto.fecha) ?? hoy();
    await this.movimientos.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const tipo = await this.resolverTipo(manager, despacho.id, persona, dto, user);
      const cuenta = await this.cuentaDe(manager, despacho.id, dto);
      if (tipo.afecta_operacion && dto.tipo === 'egreso') {
        const rows = await manager.find(CajaGeneralDespacho, { where: { despacho_id: despacho.id } });
        if (saldoCaja(rows) + 0.001 < monto) throw new BadRequestException('La caja general no alcanza para ese egreso.');
      }
      const concepto = `${tipo.nombre} · ${persona.name}`.slice(0, 180);
      const row = await manager.save(
        CajaGeneralDespacho,
        manager.create(CajaGeneralDespacho, {
          despacho_id: despacho.id,
          tipo: dto.tipo,
          concepto,
          monto: monto.toFixed(2),
          fecha,
          tipo_movimiento_id: tipo.id,
          corresponde_usuario_id: persona.id,
          usuario_id: user.id,
          cuenta_bancaria_id: cuenta?.id ?? null,
          registro_id: null,
          forma_pago: dto.forma_pago,
          descripcion,
          afecta_operacion: tipo.afecta_operacion,
          activo: true,
          origen: 'manual',
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'CajaGeneral',
          entidadId: row.id,
          referencia: concepto,
          tipo: 'alta',
          campos: altaDe({
            Tipo: dto.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
            'Tipo de movimiento': tipo.nombre,
            'Corresponde a': persona.name,
            'Forma de pago': FORMAS[dto.forma_pago],
            Cuenta: cuenta ? `${cuenta.banco} ${cuenta.numero}` : '',
            Monto: row.monto,
            Descripción: descripcion,
            'Afecta operación': tipo.afecta_operacion ? 'Sí' : 'No',
          }),
          actor: user,
        },
        manager,
      );
    });
    return this.listar(user, this.filtroDe(despacho.id));
  }

  async eliminar(user: AuthUser, id: number, dto: BajaCajaGeneralDto) {
    const despacho = await this.firma(user, dto.despacho_id, 'eliminar');
    const motivo = dto.motivo.replace(/\s+/g, ' ').trim();
    if (motivo.length < 3) throw new BadRequestException('Escribe el motivo de la eliminación.');
    await this.movimientos.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const row = await manager.findOne(CajaGeneralDespacho, { where: { id, despacho_id: despacho.id, activo: true } });
      if (!row) throw new NotFoundException('No encontramos ese movimiento.');
      if (row.tipo === 'inicio' || row.tipo === 'cuadre' || row.origen === 'inicio' || row.origen === 'cuadre') {
        throw new BadRequestException('Los inicios y los cuadres no se cancelan desde aquí.');
      }
      const rows = await manager.find(CajaGeneralDespacho, { where: { despacho_id: despacho.id } });
      const proyectado = saldoCaja(rows.map((item) => (item.id === row.id ? { ...item, activo: false } : item)));
      if (proyectado < -0.001) throw new BadRequestException('Ese movimiento ya está usado. La caja general no puede quedar en negativo.');
      row.activo = false;
      await manager.save(row);
      const tipo = row.tipo_movimiento_id ? await manager.findOne(TipoMovimientoDespacho, { where: { id: row.tipo_movimiento_id } }) : null;
      const persona = row.corresponde_usuario_id ? await manager.findOne(User, { where: { id: row.corresponde_usuario_id } }) : null;
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'CajaGeneral',
          entidadId: row.id,
          referencia: row.concepto,
          tipo: 'baja',
          campos: bajaDe({
            Tipo: row.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
            'Tipo de movimiento': tipo?.nombre ?? '',
            'Corresponde a': persona?.name ?? '',
            Monto: row.monto,
            Motivo: motivo,
          }),
          actor: user,
        },
        manager,
      );
      const registroId = row.registro_id;
      const registro = registroId
        ? await manager.findOne(RegistroMovimiento, { where: { id: registroId, despacho_id: despacho.id, activo: true } })
        : await manager.findOne(RegistroMovimiento, { where: { caja_movimiento_id: row.id, despacho_id: despacho.id, activo: true } });
      if (registro) {
        registro.activo = false;
        await manager.save(registro);
        await this.bitacora.registrar(
          {
            despachoId: despacho.id,
            entidad: 'RegistroMovimiento',
            entidadId: registro.id,
            referencia: row.concepto,
            tipo: 'baja',
            campos: bajaDe({
              Tipo: registro.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
              'Tipo de movimiento': tipo?.nombre ?? '',
              'Corresponde a': persona?.name ?? '',
              Monto: registro.monto,
              Motivo: motivo,
            }),
            actor: user,
          },
          manager,
        );
      }
    });
    return this.listar(user, this.filtroDe(despacho.id));
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
      const pendientes = gente.filter((persona) => persona.activo !== false && tieneCajaAbierta(movs, persona.id, hasta.get(persona.id) ?? 0));
      if (pendientes.length) {
        throw new BadRequestException(`Falta el corte de ${pendientes.map((persona) => persona.name).join(', ')}.`);
      }
      if (!cortes.length) throw new BadRequestException('No hay cortes pendientes de pasar a caja general.');
      const monto = centavos(cortes.reduce((total, corte) => total + money(corte.total), 0));
      const fecha = hoy();
      const row = await manager.save(
        CuadreDespacho,
        manager.create(CuadreDespacho, { despacho_id: despacho.id, fecha, monto: monto.toFixed(2) }),
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
            concepto: `Cuadre de caja chica ${fecha}`,
            monto: monto.toFixed(2),
            fecha,
            tipo_movimiento_id: null,
            corresponde_usuario_id: null,
            usuario_id: user.id,
            cuenta_bancaria_id: null,
            registro_id: null,
            forma_pago: 'efectivo',
            descripcion: `Cuadre de caja chica ${fecha}`,
            afecta_operacion: true,
            activo: true,
            origen: 'cuadre',
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
    return this.listar(user, this.filtroDe(despacho.id));
  }

  private filtroDe(despachoId: number): Filtro {
    return { despachoId, page: 1, pageSize: 50, ambito: 'operacion' };
  }

  private presentar(
    row: CajaGeneralDespacho,
    despacho: string,
    nombres: Map<number, string>,
    tipos: Map<number, TipoMovimientoDespacho>,
    porCaja: Map<number, RegistroMovimiento>,
    porId: Map<number, RegistroMovimiento>,
  ): Fila {
    const registro = (row.registro_id ? porId.get(row.registro_id) : undefined) ?? porCaja.get(row.id);
    const tipoId = row.tipo_movimiento_id ?? registro?.tipo_movimiento_id ?? null;
    const tipo = tipoId ? tipos.get(tipoId) : undefined;
    const correspondeId = row.corresponde_usuario_id ?? registro?.corresponde_usuario_id ?? null;
    const autorId = row.usuario_id ?? registro?.usuario_id ?? null;
    const formaClave = row.forma_pago ?? registro?.forma_pago ?? 'efectivo';
    const dia = ymd(row.fecha) ?? hoy();
    const inicio = row.tipo === 'inicio' || row.origen === 'inicio';
    const cuadre = row.tipo === 'cuadre' || row.origen === 'cuadre';
    let corresponde = correspondeId ? (nombres.get(correspondeId) ?? 'Persona') : '';
    if (!corresponde && inicio && row.concepto.startsWith('Inicio para ')) corresponde = row.concepto.slice('Inicio para '.length);
    return {
      id: row.id,
      fecha: instante(dia, row.created_at),
      dia,
      despacho,
      tipo: inicio || row.tipo === 'egreso' ? 'Egreso' : 'Ingreso',
      clase: inicio || row.tipo === 'egreso' ? 'egreso' : 'ingreso',
      tipo_movimiento: inicio ? 'Inicio' : cuadre ? 'Cuadre' : (tipo?.nombre ?? '—'),
      tipo_movimiento_id: tipoId,
      corresponde: corresponde || '—',
      corresponde_usuario_id: correspondeId,
      forma_pago: FORMAS[formaClave] ?? formaClave,
      forma_pago_clave: formaClave,
      monto: money(row.monto),
      estado: inicio ? 'Entregado' : cuadre ? 'Aplicado' : 'Registrado',
      usuario: autorId ? (nombres.get(autorId) ?? 'Usuario') : '—',
      descripcion: row.descripcion?.trim() || registro?.descripcion || row.concepto,
      afecta_operacion: row.afecta_operacion !== false,
      eliminable: row.tipo === 'ingreso' || row.tipo === 'egreso',
    };
  }

  private async resolverTipo(
    manager: Repository<CajaGeneralDespacho>['manager'],
    despachoId: number,
    persona: User,
    dto: CajaGeneralDto,
    actor: AuthUser,
  ) {
    if (dto.tipo_movimiento_id) {
      const tipo = await manager.findOne(TipoMovimientoDespacho, { where: { id: dto.tipo_movimiento_id, despacho_id: despachoId, activo: true } });
      if (!tipo) throw new NotFoundException('No encontramos ese tipo de movimiento.');
      await this.exigeAlcance(manager, tipo.id, persona.id);
      return tipo;
    }
    const nombre = nombreTipo(dto.tipo_nombre ?? '');
    const existentes = await manager.find(TipoMovimientoDespacho, { where: { despacho_id: despachoId } });
    const tomado = existentes.find((tipo) => sinAcento(tipo.nombre) === sinAcento(nombre));
    if (tomado) {
      if (!tomado.activo) throw new BadRequestException('Ese tipo está inhabilitado.');
      await this.exigeAlcance(manager, tomado.id, persona.id);
      return tomado;
    }
    const tipo = await manager.save(
      TipoMovimientoDespacho,
      manager.create(TipoMovimientoDespacho, { despacho_id: despachoId, nombre, afecta_operacion: true, activo: true }),
    );
    await manager.save(TipoMovimientoUsuario, manager.create(TipoMovimientoUsuario, { tipo_id: tipo.id, usuario_id: persona.id }));
    await this.bitacora.registrar(
      {
        despachoId,
        entidad: 'TipoMovimiento',
        entidadId: tipo.id,
        referencia: tipo.nombre,
        tipo: 'alta',
        campos: altaDe({ Nombre: tipo.nombre, 'Afecta operación': 'Sí', Corresponde: persona.name }),
        actor,
      },
      manager,
    );
    return tipo;
  }

  private async exigeAlcance(manager: Repository<CajaGeneralDespacho>['manager'], tipoId: number, usuarioId: number) {
    const marcas = await manager.find(TipoMovimientoUsuario, { where: { tipo_id: tipoId } });
    if (marcas.length && !marcas.some((marca) => marca.usuario_id === usuarioId)) {
      throw new BadRequestException('Ese tipo no aplica a la persona elegida.');
    }
  }

  private async cuentaDe(manager: Repository<CajaGeneralDespacho>['manager'], despachoId: number, dto: CajaGeneralDto) {
    if (dto.forma_pago === 'efectivo') return null;
    if (!dto.cuenta_bancaria_id) throw new BadRequestException('Elige la cuenta bancaria.');
    const cuenta = await manager.findOne(CuentaBancaria, { where: { id: dto.cuenta_bancaria_id, despacho_id: despachoId, activa: true } });
    if (!cuenta) throw new NotFoundException('No encontramos esa cuenta bancaria.');
    return cuenta;
  }

  private async personaDe(despachoId: number, id: number) {
    const persona = await this.users.findOne({ where: { id, despacho_id: despachoId, activo: true } });
    if (!persona) throw new BadRequestException('Elige a quién corresponde el movimiento.');
    return persona;
  }

  private async nombresDe(ids: Array<number | null>) {
    const unicos = [...new Set(ids.filter((id): id is number => Number.isInteger(id) && (id as number) > 0))];
    if (!unicos.length) return new Map<number, string>();
    const gente = await this.users.find({ where: { id: In(unicos) } });
    return new Map(gente.map((persona) => [persona.id, persona.name]));
  }

  private async firma(user: AuthUser, despachoId: number | undefined, accion: 'ver' | 'insertar' | 'eliminar') {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('La caja general la opera la administración del despacho.');
    return this.alcance.despachoDe(user, 'caja-general', despachoId, accion);
  }

  private monto(value: number) {
    const monto = centavos(value);
    if (monto < 0.01) throw new BadRequestException('El monto tiene que ser mayor a cero.');
    return monto;
  }
}

function pagina<T>(filas: T[], page: number, pageSize: number) {
  const tamano = Math.min(200, Math.max(1, pageSize || 50));
  const actual = Math.max(1, page || 1);
  const total = filas.length;
  const inicio = (actual - 1) * tamano;
  return { data: filas.slice(inicio, inicio + tamano), total, page: actual, pageSize: tamano, totalPages: Math.max(1, Math.ceil(total / tamano)) };
}

function coincide(
  fila: Fila,
  filtro: Filtro & { texto: string; desde: string; hasta: string },
) {
  if (fila.dia < filtro.desde || fila.dia > filtro.hasta) return false;
  if (filtro.tipo && fila.clase !== filtro.tipo) return false;
  if (filtro.formaPago && fila.forma_pago_clave !== filtro.formaPago) return false;
  if (filtro.tipoId && fila.tipo_movimiento_id !== filtro.tipoId) return false;
  if (filtro.usuarioId && fila.corresponde_usuario_id !== filtro.usuarioId) return false;
  if (!filtro.texto) return true;
  const bolsa = [String(fila.id), fila.descripcion, fila.forma_pago, fila.tipo, fila.tipo_movimiento, fila.corresponde, fila.usuario, fila.estado, fila.despacho]
    .join(' ')
    .toLocaleLowerCase('es-MX');
  return bolsa.includes(filtro.texto);
}

function ymd(valor: string | Date | null | undefined) {
  if (!valor) return null;
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const numero = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${numero}`;
  }
  const texto = String(valor).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function diaSiguiente(fecha: string) {
  const [anio, mes, numero] = fecha.split('-').map(Number);
  const dia = new Date(anio, mes - 1, numero);
  dia.setDate(dia.getDate() + 1);
  const mesNuevo = String(dia.getMonth() + 1).padStart(2, '0');
  const numeroNuevo = String(dia.getDate()).padStart(2, '0');
  return `${dia.getFullYear()}-${mesNuevo}-${numeroNuevo}`;
}

function instante(fecha: string, created: Date) {
  const [anio, mes, numero] = fecha.split('-').map(Number);
  const hora = created instanceof Date ? created : new Date(created);
  return new Date(anio, mes - 1, numero, hora.getHours(), hora.getMinutes(), hora.getSeconds()).toISOString();
}

function nombreTipo(raw: string) {
  const limpio = raw.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('es-MX');
  if (limpio.length < 2) throw new BadRequestException('El nombre solo admite letras y debe tener al menos 2.');
  return limpio.slice(0, 180);
}

function sinAcento(valor: string) {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('es-MX');
}
