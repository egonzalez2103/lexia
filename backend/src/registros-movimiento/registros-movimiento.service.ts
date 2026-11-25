import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe } from '../bitacora/cambios';
import { AlcanceService, centavos, hoy } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { RegistroMovimiento } from '../entities/registro-movimiento.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { saldoCaja } from '../movimientos/saldos';
import { BajaRegistroMovimientoDto, RegistroMovimientoDto } from './dto';

const FORMAS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  tarjeta: 'Tarjeta',
};

@Injectable()
export class RegistrosMovimientoService {
  constructor(
    @InjectRepository(RegistroMovimiento) private readonly registros: Repository<RegistroMovimiento>,
    @InjectRepository(TipoMovimientoDespacho) private readonly tipos: Repository<TipoMovimientoDespacho>,
    @InjectRepository(TipoMovimientoUsuario) private readonly alcances: Repository<TipoMovimientoUsuario>,
    @InjectRepository(CuentaBancaria) private readonly cuentas: Repository<CuentaBancaria>,
    @InjectRepository(CajaGeneralDespacho) private readonly caja: Repository<CajaGeneralDespacho>,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(
    user: AuthUser,
    despachoId?: number,
    q?: string,
    page = 1,
    pageSize = 50,
    ambito: 'operacion' | 'fuera' = 'operacion',
    desde?: string,
    hasta?: string,
    tipo?: 'ingreso' | 'egreso',
    tipoId?: number,
    usuarioId?: number,
  ) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', despachoId);
    const [filas, gente, tipos, cuentas] = await Promise.all([
      this.registros.find({ where: { despacho_id: despacho.id, activo: true }, order: { id: 'DESC' } }),
      this.usuarios.find({ where: { despacho_id: despacho.id, activo: true }, order: { name: 'ASC' } }),
      this.tipos.find({ where: { despacho_id: despacho.id }, order: { nombre: 'ASC' } }),
      this.cuentas.find({ where: { despacho_id: despacho.id, activa: true }, order: { banco: 'ASC' } }),
    ]);
    const marcas = tipos.length ? await this.alcances.find({ where: { tipo_id: In(tipos.map((tipoFila) => tipoFila.id)) } }) : [];
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    const autores = await this.nombresDe(filas.map((fila) => fila.usuario_id));
    const tipoDe = new Map(tipos.map((tipoFila) => [tipoFila.id, tipoFila]));
    const texto = q?.trim().toLocaleLowerCase('es-MX') ?? '';
    const inicio = dia(desde);
    const fin = dia(hasta, true);
    const vistos = filas.map((fila) => this.presentar(fila, tipoDe, nombres, autores));
    const filtrados = vistos.filter((fila) => coincide(fila, { texto, inicio, fin, tipo, tipoId, usuarioId }));
    const operacion = filtrados.filter((fila) => fila.afecta_operacion);
    const fuera = filtrados.filter((fila) => !fila.afecta_operacion);
    const paginaActual = pagina(ambito === 'fuera' ? fuera : operacion, page, pageSize);
    const suma = (lista: typeof filtrados, clase: 'ingreso' | 'egreso') =>
      centavos(lista.filter((fila) => fila.tipo === clase).reduce((total, fila) => total + fila.monto, 0));
    const visibles = ambito === 'fuera' ? fuera : operacion;
    return {
      ...paginaActual,
      total_operacion: operacion.length,
      total_fuera: fuera.length,
      suma_ingresos: suma(visibles, 'ingreso'),
      suma_egresos: suma(visibles, 'egreso'),
      es_admin: this.alcance.esAdmin(user),
      personas: gente.map((persona) => ({ id: persona.id, name: persona.name })),
      tipos: tipos
        .filter((tipoFila) => tipoFila.activo)
        .map((tipoFila) => ({
          id: tipoFila.id,
          nombre: tipoFila.nombre,
          afecta_operacion: tipoFila.afecta_operacion,
          usuario_ids: marcas.filter((marca) => marca.tipo_id === tipoFila.id).map((marca) => marca.usuario_id),
        })),
      cuentas: cuentas.map((cuenta) => ({ id: cuenta.id, banco: cuenta.banco, numero: cuenta.numero })),
    };
  }

  async crear(user: AuthUser, dto: RegistroMovimientoDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const persona = await this.personaDe(despacho.id, dto.usuario_id);
    const descripcion = dto.descripcion.replace(/\s+/g, ' ').trim();
    if (descripcion.length < 3) throw new BadRequestException('Describe el motivo del movimiento.');
    const monto = centavos(dto.monto);
    if (monto < 0.01) throw new BadRequestException('El monto tiene que ser mayor a cero.');
    await this.registros.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const tipo = await this.resolverTipo(manager, despacho.id, persona, dto, user);
      const cuenta = await this.cuentaDe(manager, despacho.id, dto);
      let cajaId: number | null = null;
      if (tipo.afecta_operacion) {
        const movimientos = await manager.find(CajaGeneralDespacho, { where: { despacho_id: despacho.id } });
        if (dto.tipo === 'egreso' && saldoCaja(movimientos) + 0.001 < monto) {
          throw new BadRequestException('La caja general no alcanza para ese egreso.');
        }
        const caja = await manager.save(
          CajaGeneralDespacho,
          manager.create(CajaGeneralDespacho, {
            despacho_id: despacho.id,
            tipo: dto.tipo,
            concepto: `${tipo.nombre} · ${persona.name}`.slice(0, 180),
            monto: monto.toFixed(2),
            fecha: hoy(),
          }),
        );
        cajaId = caja.id;
        await this.bitacora.registrar(
          {
            despachoId: despacho.id,
            entidad: 'CajaGeneral',
            entidadId: caja.id,
            referencia: caja.concepto,
            tipo: 'alta',
            campos: altaDe({ Tipo: dto.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', Concepto: caja.concepto, Monto: caja.monto }),
            actor: user,
          },
          manager,
        );
      }
      const row = await manager.save(
        RegistroMovimiento,
        manager.create(RegistroMovimiento, {
          despacho_id: despacho.id,
          tipo_movimiento_id: tipo.id,
          corresponde_usuario_id: persona.id,
          usuario_id: user.id,
          tipo: dto.tipo,
          forma_pago: dto.forma_pago,
          cuenta_bancaria_id: cuenta?.id ?? null,
          monto: monto.toFixed(2),
          descripcion,
          afecta_operacion: tipo.afecta_operacion,
          caja_movimiento_id: cajaId,
          activo: true,
        }),
      );
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'RegistroMovimiento',
          entidadId: row.id,
          referencia: `${tipo.nombre} · ${persona.name}`,
          tipo: 'alta',
          campos: altaDe({
            Tipo: dto.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
            'Tipo de movimiento': tipo.nombre,
            'Corresponde a': persona.name,
            'Forma de pago': FORMAS[dto.forma_pago],
            Cuenta: cuenta ? `${cuenta.banco} ${cuenta.numero}` : '',
            Monto: row.monto,
            Descripción: descripcion,
          }),
          actor: user,
        },
        manager,
      );
    });
    return this.listar(user, despacho.id);
  }

  async eliminar(user: AuthUser, id: number, dto: BajaRegistroMovimientoDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'eliminar');
    const motivo = dto.motivo.replace(/\s+/g, ' ').trim();
    await this.registros.manager.transaction(async (manager) => {
      await manager.query('SELECT id FROM despachos WHERE id = ? FOR UPDATE', [despacho.id]);
      const row = await manager.findOne(RegistroMovimiento, { where: { id, despacho_id: despacho.id, activo: true } });
      if (!row) throw new NotFoundException('No encontramos ese movimiento.');
      const tipo = await manager.findOne(TipoMovimientoDespacho, { where: { id: row.tipo_movimiento_id } });
      const persona = await manager.findOne(User, { where: { id: row.corresponde_usuario_id } });
      if (row.caja_movimiento_id) {
        const caja = await manager.findOne(CajaGeneralDespacho, { where: { id: row.caja_movimiento_id, despacho_id: despacho.id } });
        if (caja) {
          await manager.delete(CajaGeneralDespacho, caja.id);
          await this.bitacora.registrar(
            {
              despachoId: despacho.id,
              entidad: 'CajaGeneral',
              entidadId: caja.id,
              referencia: caja.concepto,
              tipo: 'baja',
              campos: bajaDe({ Tipo: caja.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', Concepto: caja.concepto, Monto: caja.monto, Motivo: motivo }),
              actor: user,
            },
            manager,
          );
        }
      }
      row.activo = false;
      await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'RegistroMovimiento',
          entidadId: row.id,
          referencia: `${tipo?.nombre ?? 'Movimiento'} · ${persona?.name ?? 'Persona'}`,
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
    });
    return this.listar(user, despacho.id);
  }

  private presentar(
    fila: RegistroMovimiento,
    tipoDe: Map<number, TipoMovimientoDespacho>,
    nombres: Map<number, string>,
    autores: Map<number, string>,
  ) {
    return {
      id: fila.id,
      fecha: fila.created_at instanceof Date ? fila.created_at.toISOString() : String(fila.created_at),
      tipo: fila.tipo,
      tipo_movimiento: tipoDe.get(fila.tipo_movimiento_id)?.nombre ?? 'Tipo',
      tipo_movimiento_id: fila.tipo_movimiento_id,
      corresponde: nombres.get(fila.corresponde_usuario_id) ?? autores.get(fila.corresponde_usuario_id) ?? 'Persona',
      corresponde_usuario_id: fila.corresponde_usuario_id,
      forma_pago: FORMAS[fila.forma_pago] ?? fila.forma_pago,
      forma_pago_clave: fila.forma_pago,
      monto: money(fila.monto),
      estado: 'Registrado',
      usuario: autores.get(fila.usuario_id) ?? 'Usuario',
      descripcion: fila.descripcion,
      afecta_operacion: fila.afecta_operacion,
    };
  }

  private async resolverTipo(
    manager: Repository<RegistroMovimiento>['manager'],
    despachoId: number,
    persona: User,
    dto: RegistroMovimientoDto,
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

  private async exigeAlcance(manager: Repository<RegistroMovimiento>['manager'], tipoId: number, usuarioId: number) {
    const marcas = await manager.find(TipoMovimientoUsuario, { where: { tipo_id: tipoId } });
    if (marcas.length && !marcas.some((marca) => marca.usuario_id === usuarioId)) {
      throw new BadRequestException('Ese tipo no aplica a la persona elegida.');
    }
  }

  private async cuentaDe(manager: Repository<RegistroMovimiento>['manager'], despachoId: number, dto: RegistroMovimientoDto) {
    if (dto.forma_pago === 'efectivo') return null;
    if (!dto.cuenta_bancaria_id) throw new BadRequestException('Elige la cuenta bancaria.');
    const cuenta = await manager.findOne(CuentaBancaria, { where: { id: dto.cuenta_bancaria_id, despacho_id: despachoId, activa: true } });
    if (!cuenta) throw new NotFoundException('No encontramos esa cuenta bancaria.');
    return cuenta;
  }

  private async personaDe(despachoId: number, id: number) {
    const persona = await this.usuarios.findOne({ where: { id, despacho_id: despachoId, activo: true } });
    if (!persona) throw new BadRequestException('Elige a quién corresponde el movimiento.');
    return persona;
  }

  private async nombresDe(ids: number[]) {
    const unicos = [...new Set(ids)];
    if (!unicos.length) return new Map<number, string>();
    const gente = await this.usuarios.find({ where: { id: In(unicos) } });
    return new Map(gente.map((persona) => [persona.id, persona.name]));
  }

  private exigeAdmin(user: AuthUser) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('El registro de movimientos lo opera la administración del despacho.');
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
  fila: { id: number; descripcion: string; forma_pago: string; tipo: string; tipo_movimiento: string; tipo_movimiento_id: number; corresponde: string; corresponde_usuario_id: number; usuario: string; estado: string; fecha: string },
  filtro: { texto: string; inicio: Date | null; fin: Date | null; tipo?: string; tipoId?: number; usuarioId?: number },
) {
  const fecha = new Date(fila.fecha);
  if (filtro.inicio && fecha < filtro.inicio) return false;
  if (filtro.fin && fecha >= filtro.fin) return false;
  if (filtro.tipo && fila.tipo !== filtro.tipo) return false;
  if (filtro.tipoId && fila.tipo_movimiento_id !== filtro.tipoId) return false;
  if (filtro.usuarioId && fila.corresponde_usuario_id !== filtro.usuarioId) return false;
  if (!filtro.texto) return true;
  const bolsa = [String(fila.id), fila.descripcion, fila.forma_pago, fila.tipo, fila.tipo_movimiento, fila.corresponde, fila.usuario, fila.estado]
    .join(' ')
    .toLocaleLowerCase('es-MX');
  return bolsa.includes(filtro.texto);
}

function dia(valor: string | undefined, siguiente = false) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [anio, mes, numero] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, numero);
  if (siguiente) fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

function nombreTipo(raw: string) {
  const limpio = raw.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('es-MX');
  if (limpio.length < 2) throw new BadRequestException('El nombre solo admite letras y debe tener al menos 2.');
  return limpio.slice(0, 180);
}

function sinAcento(valor: string) {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('es-MX');
}
