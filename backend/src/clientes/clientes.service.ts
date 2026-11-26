import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe, diffCampos } from '../bitacora/cambios';
import { AlcanceService } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { Cliente } from '../entities/cliente.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { ClienteDto } from './dto';

const TAMANOS = [10, 25, 50, 100, 200];

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(MovimientoDespacho) private readonly movimientos: Repository<MovimientoDespacho>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async list(user: AuthUser, despachoId?: number, q?: string, page = 1, pageSize = 50) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', despachoId);
    const tamano = TAMANOS.includes(pageSize) ? pageSize : 50;
    const todos = await this.clientes.find({
      where: { despacho_id: despacho.id, activo: true },
      order: { nombre: 'ASC', id: 'ASC' },
    });
    const texto = q?.trim().toLocaleLowerCase('es-MX') ?? '';
    const digitos = texto.replace(/\D/g, '');
    const filtrados = todos.filter((row) => coincide(row, texto, digitos));
    const total = filtrados.length;
    const totalPages = Math.max(1, Math.ceil(total / tamano));
    const pagina = Math.min(Math.max(1, page), totalPages);
    const slice = filtrados.slice((pagina - 1) * tamano, pagina * tamano);
    const [conteoMovimientos, expedientes, autores] = await Promise.all([
      this.conteoMovimientos(despacho.id),
      this.expedientes.find({ where: { despacho_id: despacho.id }, select: { cliente: true } }),
      this.autoresDe(slice),
    ]);
    const conteoExpedientes = new Map<string, number>();
    for (const expediente of expedientes) {
      const clave = normalizar(expediente.cliente);
      if (!clave) continue;
      conteoExpedientes.set(clave, (conteoExpedientes.get(clave) ?? 0) + 1);
    }
    return {
      despacho_id: despacho.id,
      despacho: despacho.name,
      data: slice.map((row) =>
        this.presentar(row, {
          autor: row.autor_id ? (autores.get(row.autor_id) ?? null) : null,
          expedientes: conteoExpedientes.get(normalizar(nombre(row))) ?? 0,
          movimientos: conteoMovimientos.get(row.id) ?? 0,
        }),
      ),
      total,
      page: pagina,
      pageSize: tamano,
      totalPages,
    };
  }

  async one(user: AuthUser, id: number, despachoId?: number) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', despachoId);
    const cliente = await this.buscar(despacho.id, id);
    const pagos = await this.movimientos.find({
      where: { despacho_id: despacho.id, cliente_id: cliente.id, tipo: 'ingreso', estado: 'aplicado' },
      order: { id: 'DESC' },
    });
    const autor = cliente.autor_id ? await this.usuarios.findOne({ where: { id: cliente.autor_id }, select: { id: true, name: true } }) : null;
    return {
      ...this.presentar(cliente, { autor: autor?.name ?? null }),
      pagos: pagos.map((pago) => ({
        id: pago.id,
        concepto: pago.concepto,
        monto: money(pago.monto),
        fecha: String(pago.fecha).slice(0, 10),
      })),
    };
  }

  async create(user: AuthUser, dto: ClienteDto) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', dto.despacho_id, 'insertar');
    const row = this.clientes.create({
      despacho_id: despacho.id,
      activo: dto.activo ?? true,
      tipo: 'fisica',
      nombre: '',
      autor_id: user.id,
    });
    this.aplicar(dto, row, true);
    const saved = await this.clientes.manager.transaction(async (manager) => {
      const guardado = await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'Cliente',
          entidadId: guardado.id,
          referencia: nombre(guardado),
          tipo: 'alta',
          campos: altaDe(ficha(guardado)),
          actor: user,
        },
        manager,
      );
      return guardado;
    });
    return this.presentar(saved, { autor: user.name });
  }

  async update(user: AuthUser, id: number, dto: ClienteDto) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', dto.despacho_id, 'actualizar');
    const saved = await this.clientes.manager.transaction(async (manager) => {
      const row = await manager.findOne(Cliente, { where: { id, despacho_id: despacho.id, activo: true } });
      if (!row) throw new NotFoundException('No encontramos ese cliente.');
      const antes = ficha(row);
      this.aplicar(dto, row, false);
      const guardado = await manager.save(row);
      const campos = diffCampos(antes, ficha(guardado));
      if (campos) {
        await this.bitacora.registrar(
          {
            despachoId: despacho.id,
            entidad: 'Cliente',
            entidadId: guardado.id,
            referencia: nombre(guardado),
            tipo: 'edicion',
            campos,
            actor: user,
          },
          manager,
        );
      }
      return guardado;
    });
    const autor = saved.autor_id ? await this.usuarios.findOne({ where: { id: saved.autor_id }, select: { id: true, name: true } }) : null;
    return this.presentar(saved, { autor: autor?.name ?? null });
  }

  async eliminar(user: AuthUser, id: number, despachoId?: number) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', despachoId, 'eliminar');
    await this.clientes.manager.transaction(async (manager) => {
      const row = await manager.findOne(Cliente, { where: { id, despacho_id: despacho.id, activo: true } });
      if (!row) throw new NotFoundException('No encontramos ese cliente.');
      const ligados = await manager.count(MovimientoDespacho, { where: { despacho_id: despacho.id, cliente_id: row.id } });
      if (ligados > 0) throw new BadRequestException('Ese cliente tiene movimientos registrados. No se puede eliminar.');
      const antes = ficha(row);
      row.activo = false;
      await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'Cliente',
          entidadId: row.id,
          referencia: nombre(row),
          tipo: 'baja',
          campos: bajaDe(antes),
          actor: user,
        },
        manager,
      );
    });
    return { ok: true };
  }

  private aplicar(dto: ClienteDto, row: Cliente, alta: boolean) {
    const tipo = dto.tipo ?? row.tipo ?? 'fisica';
    if (alta || dto.tipo !== undefined) row.tipo = tipo;
    if (alta || dto.nombre !== undefined) row.nombre = dto.nombre.trim();
    if (tipo === 'moral') {
      row.paterno = null;
      row.materno = null;
      row.fecha_nacimiento = null;
      row.genero = null;
    } else if (alta || dto.paterno !== undefined) {
      const paterno = dto.paterno?.trim() || '';
      if (!paterno) throw new BadRequestException('El apellido paterno es obligatorio.');
      row.paterno = paterno;
      if (dto.materno !== undefined) row.materno = dto.materno?.trim() || null;
      if (alta || dto.fecha_nacimiento !== undefined) row.fecha_nacimiento = fechaNacimientoDe(dto.fecha_nacimiento);
      if (alta || dto.genero !== undefined) row.genero = dto.genero ?? null;
    } else if (!row.paterno?.trim()) {
      throw new BadRequestException('El apellido paterno es obligatorio.');
    } else {
      if (dto.materno !== undefined) row.materno = dto.materno?.trim() || null;
      if (dto.fecha_nacimiento !== undefined) row.fecha_nacimiento = fechaNacimientoDe(dto.fecha_nacimiento);
      if (dto.genero !== undefined) row.genero = dto.genero ?? null;
    }
    if (dto.rfc !== undefined) row.rfc = dto.rfc?.trim().toUpperCase() || null;
    if (dto.domicilio !== undefined) row.domicilio = dto.domicilio?.trim() || null;
    if (dto.telefono !== undefined) row.telefono = telefonoDe(dto.telefono);
    if (dto.correo !== undefined) row.correo = dto.correo?.trim().toLowerCase() || null;
    if (dto.zona_residencia !== undefined) row.zona_residencia = dto.zona_residencia?.trim() || null;
    if (dto.notas !== undefined) row.notas = dto.notas?.trim() || null;
    if (dto.activo !== undefined) row.activo = dto.activo;
  }

  private async buscar(despachoId: number, id: number) {
    const row = await this.clientes.findOne({ where: { id, despacho_id: despachoId, activo: true } });
    if (!row) throw new NotFoundException('No encontramos ese cliente.');
    return row;
  }

  private async conteoMovimientos(despachoId: number) {
    const rows = await this.movimientos
      .createQueryBuilder('movimiento')
      .select('movimiento.cliente_id', 'cliente_id')
      .addSelect('COUNT(*)', 'total')
      .where('movimiento.despacho_id = :despachoId', { despachoId })
      .andWhere('movimiento.cliente_id IS NOT NULL')
      .groupBy('movimiento.cliente_id')
      .getRawMany<{ cliente_id: number | string; total: string }>();
    return new Map(rows.map((row) => [Number(row.cliente_id), Number(row.total)]));
  }

  private async autoresDe(rows: Cliente[]) {
    const ids = [...new Set(rows.map((row) => row.autor_id).filter((id): id is number => id != null))];
    if (ids.length === 0) return new Map<number, string>();
    const usuarios = await this.usuarios.find({ where: { id: In(ids) }, select: { id: true, name: true } });
    return new Map(usuarios.map((usuario) => [usuario.id, usuario.name]));
  }

  private presentar(
    row: Cliente,
    extra: { autor?: string | null; expedientes?: number; movimientos?: number } = {},
  ) {
    return {
      id: row.id,
      tipo: row.tipo,
      nombre: row.nombre,
      paterno: row.paterno,
      materno: row.materno,
      nombre_completo: nombre(row),
      rfc: row.rfc,
      domicilio: row.domicilio,
      telefono: row.telefono,
      correo: row.correo,
      notas: row.notas,
      activo: row.activo,
      fecha_nacimiento: ymd(row.fecha_nacimiento),
      genero: row.genero,
      zona_residencia: row.zona_residencia,
      fecha_registro: instante(row.created_at),
      autor: extra.autor ?? null,
      expedientes: extra.expedientes ?? 0,
      movimientos: extra.movimientos ?? 0,
    };
  }
}

function nombre(row: Pick<Cliente, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function normalizar(value?: string | null) {
  return (value ?? '').trim().toLocaleLowerCase('es-MX').replace(/\s+/g, ' ');
}

function coincide(row: Cliente, texto: string, digitos: string) {
  if (!texto) return true;
  const bolsa = [nombre(row), row.correo, row.domicilio, row.zona_residencia, row.rfc, row.genero]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es-MX');
  if (bolsa.includes(texto)) return true;
  return digitos.length >= 3 && (row.telefono ?? '').includes(digitos);
}

function ficha(row: Cliente) {
  return {
    Tipo: row.tipo === 'moral' ? 'Persona moral' : 'Persona física',
    Nombre: nombre(row),
    'Fecha de nacimiento': ymd(row.fecha_nacimiento),
    Género: row.genero,
    RFC: row.rfc,
    Domicilio: row.domicilio,
    Teléfono: row.telefono,
    Correo: row.correo,
    'Zona de residencia': row.zona_residencia,
    Notas: row.notas,
    Activo: row.activo ? 'Sí' : 'No',
  };
}

function instante(value: string | Date) {
  if (typeof value === 'string') {
    const texto = value.includes('T') ? value : value.replace(' ', 'T');
    return texto.endsWith('Z') ? texto : `${texto}Z`;
  }
  return new Date(Date.UTC(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds(),
  )).toISOString();
}

function ymd(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const texto = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function fechaNacimientoDe(value?: string | null) {
  if (!value) return null;
  const dia = ymd(value);
  if (!dia) throw new BadRequestException('La fecha de nacimiento no es válida.');
  const [anio, mes, fecha] = dia.split('-').map(Number);
  const nacimiento = new Date(anio, mes - 1, fecha);
  if (nacimiento.getFullYear() !== anio || nacimiento.getMonth() !== mes - 1 || nacimiento.getDate() !== fecha) {
    throw new BadRequestException('La fecha de nacimiento no es válida.');
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (nacimiento > hoy) throw new BadRequestException('La fecha de nacimiento no puede ser futura.');
  return dia;
}

function telefonoDe(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 10) throw new BadRequestException('El teléfono debe tener 10 dígitos.');
  return digits;
}
