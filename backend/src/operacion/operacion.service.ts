import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { exigirFuncion, esDireccion } from '../common/funcion';
import { hoy } from '../common/alcance.service';
import { money } from '../common/slug';
import { Abono } from '../entities/abono.entity';
import { Asunto } from '../entities/asunto.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Cargo } from '../entities/cargo.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { Deposito } from '../entities/deposito.entity';
import { DocumentoExpediente } from '../entities/documento-expediente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { Promocion } from '../entities/promocion.entity';
import { User } from '../entities/user.entity';
import { AbonoDto, AudienciaDto, CargoDto, DepositoDto, DocumentoDto, EquipoDto, RechazoDto } from './dto';

@Injectable()
export class OperacionService {
  constructor(
    @InjectRepository(Audiencia) private readonly audiencias: Repository<Audiencia>,
    @InjectRepository(DocumentoExpediente) private readonly documentos: Repository<DocumentoExpediente>,
    @InjectRepository(Cargo) private readonly cargos: Repository<Cargo>,
    @InjectRepository(Abono) private readonly abonos: Repository<Abono>,
    @InjectRepository(Deposito) private readonly depositos: Repository<Deposito>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(Promocion) private readonly promociones: Repository<Promocion>,
    @InjectRepository(Escrito) private readonly escritos: Repository<Escrito>,
    @InjectRepository(Asunto) private readonly asuntos: Repository<Asunto>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(CuentaBancaria) private readonly cuentas: Repository<CuentaBancaria>,
    @InjectRepository(MovimientoDespacho) private readonly movimientos: Repository<MovimientoDespacho>,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    @InjectRepository(CatalogoJuridico) private readonly catalogos: Repository<CatalogoJuridico>,
    private readonly bitacora: BitacoraService,
  ) {}

  async agenda(user: AuthUser, desde?: string, hasta?: string) {
    const despachoId = this.despacho(user);
    const inicio = desde?.slice(0, 10) || hoy();
    const fin = hasta?.slice(0, 10) || sumarDias(inicio, 7);
    const rows = await this.audiencias.find({ where: { despacho_id: despachoId }, order: { fecha: 'ASC', hora: 'ASC' } });
    const visibles = await this.porSede(user, rows);
    const expedientes = await this.mapaExpedientes(visibles.map((row) => row.expediente_id));
    return visibles
      .filter((row) => dia(row.fecha) >= inicio && dia(row.fecha) <= fin)
      .map((row) => ({ ...row, fecha: dia(row.fecha), expediente: expedientes.get(row.expediente_id) ?? '' }));
  }

  async crearAudiencia(user: AuthUser, dto: AudienciaDto) {
    exigirFuncion(user, 'escribir');
    const expediente = await this.expedienteDe(user, dto.expediente_id);
    const saved = await this.audiencias.save(
      this.audiencias.create({
        despacho_id: expediente.despacho_id,
        expediente_id: expediente.id,
        titulo: dto.titulo.trim(),
        fecha: dto.fecha.slice(0, 10),
        hora: dto.hora ?? null,
        lugar: dto.lugar?.trim() || null,
        notas: dto.notas?.trim() || null,
      }),
    );
    await this.anotar(user, 'Audiencia', saved.id, saved.titulo, expediente.despacho_id, { Expediente: expediente.titulo, Fecha: saved.fecha });
    return saved;
  }

  async quitarAudiencia(user: AuthUser, id: number) {
    exigirFuncion(user, 'escribir');
    const row = await this.audiencias.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa audiencia.');
    this.mismo(user, row.despacho_id);
    await this.audiencias.delete({ id });
    return { ok: true };
  }

  async documentosDe(user: AuthUser, expedienteId: number) {
    const expediente = await this.expedienteDe(user, expedienteId);
    const rows = await this.documentos.find({ where: { expediente_id: expediente.id }, order: { id: 'DESC' } });
    return this.verDocumentos(user, rows);
  }

  async crearDocumento(user: AuthUser, dto: DocumentoDto) {
    exigirFuncion(user, 'escribir');
    const expediente = await this.expedienteDe(user, dto.expediente_id);
    if ((dto.clasificacion === 'reservado' || dto.clasificacion === 'privilegiado') && !esDireccion(user) && user.funcion === 'pasante') {
      throw new ForbiddenException('Un pasante no clasifica documentos reservados.');
    }
    const saved = await this.documentos.save(
      this.documentos.create({
        despacho_id: expediente.despacho_id,
        expediente_id: expediente.id,
        titulo: dto.titulo.trim(),
        clasificacion: dto.clasificacion,
        archivo_url: dto.archivo_url?.trim() || null,
        notas: dto.notas?.trim() || null,
      }),
    );
    await this.anotar(user, 'Documento', saved.id, saved.titulo, expediente.despacho_id, { Clasificación: saved.clasificacion });
    return saved;
  }

  async quitarDocumento(user: AuthUser, id: number) {
    exigirFuncion(user, 'escribir');
    const row = await this.documentos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese documento.');
    this.mismo(user, row.despacho_id);
    if ((row.clasificacion === 'reservado' || row.clasificacion === 'privilegiado') && !esDireccion(user)) {
      throw new ForbiddenException('Ese documento lo retira la dirección del despacho.');
    }
    await this.documentos.delete({ id });
    return { ok: true };
  }

  async actuaciones(user: AuthUser, expedienteId: number) {
    const expediente = await this.expedienteDe(user, expedienteId);
    const [promociones, escritos, audiencias, documentos] = await Promise.all([
      this.promociones.find({ where: { expediente_id: expediente.id } }),
      this.escritos.find({ where: { expediente_id: expediente.id } }),
      this.audiencias.find({ where: { expediente_id: expediente.id } }),
      this.documentos.find({ where: { expediente_id: expediente.id } }),
    ]);
    const docs = this.verDocumentos(user, documentos);
    return [
      ...promociones.map((row) => ({ id: row.id, tipo: 'Promoción', titulo: row.titulo, fecha: dia(row.presentada_el) })),
      ...escritos.map((row) => ({ id: row.id, tipo: 'Escrito', titulo: row.titulo, fecha: dia(row.created_at) })),
      ...audiencias.map((row) => ({ id: row.id, tipo: 'Audiencia', titulo: row.titulo, fecha: dia(row.fecha) })),
      ...docs.map((row) => ({ id: row.id, tipo: 'Documento', titulo: row.titulo, fecha: dia(row.created_at), clasificacion: row.clasificacion })),
    ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }

  async cartera(user: AuthUser) {
    const despachoId = this.despacho(user);
    const [cargos, abonos, clientes, asuntos] = await Promise.all([
      this.cargos.find({ where: { despacho_id: despachoId }, order: { vence_el: 'ASC' } }),
      this.abonos.find({ where: { despacho_id: despachoId }, order: { id: 'DESC' } }),
      this.clientes.find({ where: { despacho_id: despachoId, activo: true } }),
      this.asuntos.find({ where: { despacho_id: despachoId } }),
    ]);
    const nombres = new Map(clientes.map((row) => [row.id, nombreCliente(row)]));
    const asuntosNombre = new Map(asuntos.map((row) => [row.id, row.titulo]));
    const abonadoCargo = new Map<number, number>();
    for (const abono of abonos) {
      if (!abono.cargo_id) continue;
      abonadoCargo.set(abono.cargo_id, (abonadoCargo.get(abono.cargo_id) ?? 0) + money(abono.monto));
    }
    const limite = sumarDias(hoy(), 7);
    const semana = cargos
      .map((cargo) => ({ ...cargo, vence_el: cargo.vence_el ? dia(cargo.vence_el) : null, saldo: redondear(money(cargo.monto) - (abonadoCargo.get(cargo.id) ?? 0)) }))
      .filter((cargo) => cargo.saldo > 0 && (!cargo.vence_el || cargo.vence_el <= limite))
      .map((cargo) => ({
        id: cargo.id,
        concepto: cargo.concepto,
        vence_el: cargo.vence_el,
        saldo: cargo.saldo,
        cliente: nombres.get(cargo.cliente_id) ?? '',
        asunto: asuntosNombre.get(cargo.asunto_id) ?? '',
      }));
    const porCliente = new Map<number, { cargos: number; abonos: number }>();
    for (const cargo of cargos) sumar(porCliente, cargo.cliente_id, 'cargos', money(cargo.monto));
    for (const abono of abonos) sumar(porCliente, abono.cliente_id, 'abonos', money(abono.monto));
    return {
      semana,
      saldos: [...porCliente.entries()].map(([clienteId, totales]) => ({
        cliente_id: clienteId,
        cliente: nombres.get(clienteId) ?? '',
        cargos: redondear(totales.cargos),
        abonos: redondear(totales.abonos),
        saldo: redondear(totales.cargos - totales.abonos),
      })),
      asuntos: asuntos.map((row) => ({
        id: row.id,
        titulo: row.titulo,
        cliente_id: row.cliente_id,
        cliente: nombres.get(row.cliente_id) ?? '',
        monto_acordado: row.monto_acordado ? money(row.monto_acordado) : null,
        esquema: row.esquema,
      })),
    };
  }

  async crearCargo(user: AuthUser, dto: CargoDto) {
    exigirFuncion(user, 'dinero');
    const asunto = await this.asuntoDe(user, dto.asunto_id);
    const saved = await this.cargos.save(
      this.cargos.create({
        despacho_id: asunto.despacho_id,
        cliente_id: asunto.cliente_id,
        asunto_id: asunto.id,
        concepto: dto.concepto.trim(),
        monto: this.monto(dto.monto).toFixed(2),
        vence_el: dto.vence_el?.slice(0, 10) ?? null,
      }),
    );
    await this.anotar(user, 'Cargo', saved.id, saved.concepto, asunto.despacho_id, { Monto: saved.monto, Asunto: asunto.titulo });
    return saved;
  }

  async crearAbono(user: AuthUser, dto: AbonoDto) {
    exigirFuncion(user, 'dinero');
    const despachoId = this.despacho(user);
    const cliente = await this.clientes.findOne({ where: { id: dto.cliente_id, despacho_id: despachoId, activo: true } });
    if (!cliente) throw new BadRequestException('Elige un cliente de este despacho.');
    if (dto.asunto_id) await this.asuntoDe(user, dto.asunto_id);
    const monto = this.monto(dto.monto);
    if (dto.cargo_id) await this.cabeEnCargo(despachoId, dto.cargo_id, monto);
    const saved = await this.abonos.manager.transaction(async (manager) => {
      let movimientoId: number | null = null;
      if (dto.medio === 'efectivo') {
        const movimiento = await manager.save(
          MovimientoDespacho,
          manager.create(MovimientoDespacho, {
            despacho_id: despachoId,
            usuario_id: user.id,
            tipo: 'ingreso',
            estado: 'aplicado',
            concepto: dto.concepto.trim().slice(0, 180),
            monto: monto.toFixed(2),
            fecha: dto.fecha.slice(0, 10),
            contraparte_usuario_id: null,
            cliente_id: cliente.id,
            notas: 'Abono de honorarios',
          }),
        );
        movimientoId = movimiento.id;
      }
      return manager.save(
        Abono,
        manager.create(Abono, {
          despacho_id: despachoId,
          cliente_id: cliente.id,
          asunto_id: dto.asunto_id ?? null,
          cargo_id: dto.cargo_id ?? null,
          concepto: dto.concepto.trim(),
          monto: monto.toFixed(2),
          medio: dto.medio,
          fecha: dto.fecha.slice(0, 10),
          movimiento_id: movimientoId,
        }),
      );
    });
    await this.anotar(user, 'Abono', saved.id, saved.concepto, despachoId, { Monto: saved.monto, Medio: saved.medio, Cliente: nombreCliente(cliente) });
    return saved;
  }

  async abono(user: AuthUser, id: number) {
    const row = await this.abonos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese recibo.');
    this.mismo(user, row.despacho_id);
    const [cliente, asunto] = await Promise.all([
      this.clientes.findOne({ where: { id: row.cliente_id } }),
      row.asunto_id ? this.asuntos.findOne({ where: { id: row.asunto_id } }) : Promise.resolve(null),
    ]);
    return {
      ...row,
      fecha: dia(row.fecha),
      monto: money(row.monto),
      cliente: cliente ? nombreCliente(cliente) : '',
      asunto: asunto?.titulo ?? null,
      recibio: user.name,
    };
  }

  async depositosDe(user: AuthUser) {
    const rows = await this.depositos.find({ where: { despacho_id: this.despacho(user) }, order: { id: 'DESC' } });
    const clientes = await this.clientes.find({ where: { id: In(rows.map((row) => row.cliente_id).concat(0)) } });
    const nombres = new Map(clientes.map((row) => [row.id, nombreCliente(row)]));
    return rows.map((row) => ({ ...row, fecha: dia(row.fecha), monto: money(row.monto), cliente: nombres.get(row.cliente_id) ?? '' }));
  }

  async crearDeposito(user: AuthUser, dto: DepositoDto) {
    exigirFuncion(user, 'dinero');
    const despachoId = this.despacho(user);
    const cliente = await this.clientes.findOne({ where: { id: dto.cliente_id, despacho_id: despachoId, activo: true } });
    if (!cliente) throw new BadRequestException('Elige un cliente de este despacho.');
    if (dto.asunto_id) await this.asuntoDe(user, dto.asunto_id);
    if (dto.cuenta_bancaria_id) {
      const cuenta = await this.cuentas.findOne({ where: { id: dto.cuenta_bancaria_id, despacho_id: despachoId, activa: true } });
      if (!cuenta) throw new BadRequestException('Esa cuenta no pertenece al despacho.');
    }
    const saved = await this.depositos.save(
      this.depositos.create({
        despacho_id: despachoId,
        cliente_id: cliente.id,
        asunto_id: dto.asunto_id ?? null,
        cuenta_bancaria_id: dto.cuenta_bancaria_id ?? null,
        monto: this.monto(dto.monto).toFixed(2),
        fecha: dto.fecha.slice(0, 10),
        referencia: dto.referencia?.trim() || null,
        estado: 'pendiente',
        motivo: null,
        abono_id: null,
      }),
    );
    await this.anotar(user, 'Deposito', saved.id, saved.referencia || 'Depósito', despachoId, { Monto: saved.monto, Estado: 'Pendiente', Cliente: nombreCliente(cliente) });
    return saved;
  }

  async autorizarDeposito(user: AuthUser, id: number) {
    exigirFuncion(user, 'dinero');
    const deposito = await this.depositoDe(user, id);
    if (deposito.estado !== 'pendiente') throw new BadRequestException('Ese depósito ya fue resuelto.');
    const abono = await this.abonos.save(
      this.abonos.create({
        despacho_id: deposito.despacho_id,
        cliente_id: deposito.cliente_id,
        asunto_id: deposito.asunto_id,
        cargo_id: null,
        concepto: `Depósito ${deposito.referencia || deposito.id}`.slice(0, 180),
        monto: deposito.monto,
        medio: 'transferencia',
        fecha: dia(deposito.fecha),
        movimiento_id: null,
      }),
    );
    deposito.estado = 'autorizado';
    deposito.abono_id = abono.id;
    await this.depositos.save(deposito);
    await this.anotar(user, 'Deposito', deposito.id, deposito.referencia || 'Depósito', deposito.despacho_id, { Estado: 'Autorizado', Recibo: String(abono.id) });
    return deposito;
  }

  async rechazarDeposito(user: AuthUser, id: number, dto: RechazoDto) {
    exigirFuncion(user, 'dinero');
    const deposito = await this.depositoDe(user, id);
    if (deposito.estado !== 'pendiente') throw new BadRequestException('Ese depósito ya fue resuelto.');
    deposito.estado = 'rechazado';
    deposito.motivo = dto.motivo.trim();
    await this.depositos.save(deposito);
    await this.anotar(user, 'Deposito', deposito.id, deposito.referencia || 'Depósito', deposito.despacho_id, { Estado: 'Rechazado', Motivo: deposito.motivo });
    return deposito;
  }

  async equipo(user: AuthUser) {
    if (!esDireccion(user)) throw new ForbiddenException('El equipo lo ve la dirección del despacho.');
    const despachoId = this.despacho(user);
    const [gente, sedes] = await Promise.all([
      this.usuarios.find({ where: { despacho_id: despachoId }, order: { name: 'ASC' } }),
      this.catalogos.find({ where: { despacho_id: despachoId, tipo: 'sede' }, order: { nombre: 'ASC' } }),
    ]);
    return {
      sedes: sedes.map((row) => ({ id: row.id, nombre: row.nombre })),
      personas: gente.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        funcion: row.funcion,
        sede_id: row.sede_id,
        activo: row.activo,
      })),
    };
  }

  async asignar(user: AuthUser, id: number, dto: EquipoDto) {
    if (!esDireccion(user)) throw new ForbiddenException('La dirección asigna la función y la sede.');
    const despachoId = this.despacho(user);
    const persona = await this.usuarios.findOne({ where: { id, despacho_id: despachoId } });
    if (!persona || persona.role !== UserRole.MIEMBRO_DESPACHO) throw new NotFoundException('Ese miembro no está en el despacho.');
    if (dto.sede_id) {
      const sede = await this.catalogos.findOne({ where: { id: dto.sede_id, despacho_id: despachoId, tipo: 'sede' } });
      if (!sede) throw new BadRequestException('Esa sede no pertenece al despacho.');
    }
    if (dto.funcion !== undefined) persona.funcion = dto.funcion;
    if (dto.sede_id !== undefined) persona.sede_id = dto.sede_id;
    return this.usuarios.save(persona);
  }

  private verDocumentos(user: AuthUser, rows: DocumentoExpediente[]) {
    if (esDireccion(user) || user.funcion === 'abogado' || !user.funcion) return rows;
    return rows.filter((row) => row.clasificacion === 'compartible' || row.clasificacion === 'interno');
  }

  private async porSede(user: AuthUser, rows: Audiencia[]) {
    if (esDireccion(user) || !user.sede_id) return rows;
    const expedientes = await this.expedientes.find({ where: { id: In(rows.map((row) => row.expediente_id).concat(0)) } });
    const propios = new Set(expedientes.filter((row) => row.sede_id == null || row.sede_id === user.sede_id).map((row) => row.id));
    return rows.filter((row) => propios.has(row.expediente_id));
  }

  private async mapaExpedientes(ids: number[]) {
    if (!ids.length) return new Map<number, string>();
    const rows = await this.expedientes.find({ where: { id: In(ids) } });
    return new Map(rows.map((row) => [row.id, row.titulo]));
  }

  private async expedienteDe(user: AuthUser, id: number) {
    const expediente = await this.expedientes.findOne({ where: { id } });
    if (!expediente) throw new NotFoundException('No encontramos ese expediente.');
    this.mismo(user, expediente.despacho_id);
    if (!esDireccion(user) && user.sede_id && expediente.sede_id && expediente.sede_id !== user.sede_id) {
      throw new ForbiddenException('Ese expediente es de otra sede.');
    }
    return expediente;
  }

  private async asuntoDe(user: AuthUser, id: number) {
    const asunto = await this.asuntos.findOne({ where: { id } });
    if (!asunto) throw new NotFoundException('No encontramos ese asunto.');
    this.mismo(user, asunto.despacho_id);
    return asunto;
  }

  private async depositoDe(user: AuthUser, id: number) {
    const row = await this.depositos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese depósito.');
    this.mismo(user, row.despacho_id);
    return row;
  }

  private async cabeEnCargo(despachoId: number, cargoId: number, monto: number) {
    const cargo = await this.cargos.findOne({ where: { id: cargoId, despacho_id: despachoId } });
    if (!cargo) throw new BadRequestException('Ese cargo no pertenece al despacho.');
    const abonos = await this.abonos.find({ where: { cargo_id: cargo.id } });
    const aplicado = abonos.reduce((total, row) => total + money(row.monto), 0);
    if (aplicado + monto > money(cargo.monto) + 0.001) throw new BadRequestException('El abono supera el saldo de ese cargo.');
  }

  private despacho(user: AuthUser) {
    if (user.role === UserRole.DUENO || user.role === UserRole.PERSONAL) {
      throw new ForbiddenException('Esto se consulta desde el acceso del despacho.');
    }
    if (!user.despacho_id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');
    return user.despacho_id;
  }

  private mismo(user: AuthUser, despachoId: number) {
    if (this.despacho(user) !== despachoId) throw new ForbiddenException('Ese registro es de otro despacho.');
  }

  private monto(value: string) {
    const numero = Number(value);
    if (!Number.isFinite(numero) || numero <= 0) throw new BadRequestException('El monto tiene que ser mayor a cero.');
    return Math.round(numero * 100) / 100;
  }

  private async anotar(user: AuthUser, entidad: string, entidadId: number, referencia: string, despachoId: number, campos: Record<string, unknown>) {
    await this.bitacora.registrar({ despachoId, entidad, entidadId, referencia, tipo: 'alta', campos: altaDe(campos), actor: user });
  }
}

function nombreCliente(row: Pick<Cliente, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function dia(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

function sumarDias(desde: string, dias: number) {
  const fecha = new Date(`${desde}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${month}-${day}`;
}

function redondear(value: number) {
  return Math.round(value * 100) / 100;
}

function sumar(mapa: Map<number, { cargos: number; abonos: number }>, id: number, campo: 'cargos' | 'abonos', monto: number) {
  const actual = mapa.get(id) ?? { cargos: 0, abonos: 0 };
  actual[campo] += monto;
  mapa.set(id, actual);
}
