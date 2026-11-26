import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe, diffCampos } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { hoy } from '../common/alcance.service';
import { Asunto } from '../entities/asunto.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { CatalogoJuridico, TipoCatalogo } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { TipoCambio } from '../entities/bitacora-edicion.entity';
import { AsuntoDto, AutoridadDto, CatalogoJuridicoDto } from './dto';

@Injectable()
export class JuridicoService {
  constructor(
    @InjectRepository(CatalogoJuridico) private readonly catalogos: Repository<CatalogoJuridico>,
    @InjectRepository(Autoridad) private readonly autoridades: Repository<Autoridad>,
    @InjectRepository(Asunto) private readonly asuntos: Repository<Asunto>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(Termino) private readonly terminos: Repository<Termino>,
    @InjectRepository(Promocion) private readonly promociones: Repository<Promocion>,
    @InjectRepository(Escrito) private readonly escritos: Repository<Escrito>,
    private readonly bitacora: BitacoraService,
  ) {}

  async catalogosDe(user: AuthUser, tipo?: string) {
    const despachoId = this.scope(user);
    const where: { despacho_id: number; tipo?: TipoCatalogo } = { despacho_id: despachoId };
    if (tipo) where.tipo = this.tipo(tipo);
    return this.catalogos.find({ where, order: { tipo: 'ASC', nombre: 'ASC' } });
  }

  async crearCatalogo(user: AuthUser, dto: CatalogoJuridicoDto) {
    const despachoId = this.scope(user);
    const saved = await this.catalogos.save(
      this.catalogos.create({
        despacho_id: despachoId,
        tipo: dto.tipo,
        nombre: dto.nombre.trim(),
        detalle: dto.detalle?.trim() || null,
        telefono: dto.tipo === 'sede' ? dto.telefono?.trim() || null : null,
      }),
    );
    await this.anotar(user, 'alta', 'CatalogoJuridico', saved.id, `${saved.tipo}: ${saved.nombre}`, despachoId, null, fichaCatalogo(saved));
    return saved;
  }

  async editarCatalogo(user: AuthUser, id: number, dto: CatalogoJuridicoDto) {
    const row = await this.catalogoDe(user, id);
    const antes = fichaCatalogo(row);
    row.nombre = dto.nombre.trim();
    row.detalle = dto.detalle?.trim() || null;
    row.telefono = row.tipo === 'sede' ? dto.telefono?.trim() || null : null;
    const saved = await this.catalogos.save(row);
    await this.anotar(user, 'edicion', 'CatalogoJuridico', saved.id, `${saved.tipo}: ${saved.nombre}`, saved.despacho_id, antes, fichaCatalogo(saved));
    return saved;
  }

  async quitarCatalogo(user: AuthUser, id: number) {
    const row = await this.catalogoDe(user, id);
    const expediente = await this.expedientes.exist({
      where: [{ materia_id: id }, { sede_id: id }, { jurisdiccion_id: id }, { instancia_id: id }, { estatus_id: id }],
    });
    const autoridad = await this.autoridades.exist({ where: [{ materia_id: id }, { instancia_id: id }] });
    if (expediente || autoridad) throw new BadRequestException('Ese catálogo ya está usado en un expediente o una autoridad.');
    await this.anotar(user, 'baja', 'CatalogoJuridico', row.id, `${row.tipo}: ${row.nombre}`, row.despacho_id, fichaCatalogo(row), null);
    await this.catalogos.delete({ id });
    return { ok: true };
  }

  async autoridadesDe(user: AuthUser) {
    return this.autoridades.find({ where: { despacho_id: this.scope(user) }, order: { nombre: 'ASC' } });
  }

  async crearAutoridad(user: AuthUser, dto: AutoridadDto) {
    const despachoId = this.scope(user);
    await this.catalogoOpcional(despachoId, dto.materia_id, 'materia');
    await this.catalogoOpcional(despachoId, dto.instancia_id, 'instancia');
    const saved = await this.autoridades.save(
      this.autoridades.create({
        despacho_id: despachoId,
        nombre: dto.nombre.trim(),
        materia_id: dto.materia_id ?? null,
        instancia_id: dto.instancia_id ?? null,
      }),
    );
    await this.anotar(user, 'alta', 'Autoridad', saved.id, saved.nombre, despachoId, null, fichaAutoridad(saved));
    return saved;
  }

  async editarAutoridad(user: AuthUser, id: number, dto: AutoridadDto) {
    const row = await this.autoridadDe(user, id);
    await this.catalogoOpcional(row.despacho_id, dto.materia_id, 'materia');
    await this.catalogoOpcional(row.despacho_id, dto.instancia_id, 'instancia');
    const antes = fichaAutoridad(row);
    row.nombre = dto.nombre.trim();
    row.materia_id = dto.materia_id ?? null;
    row.instancia_id = dto.instancia_id ?? null;
    const saved = await this.autoridades.save(row);
    await this.anotar(user, 'edicion', 'Autoridad', saved.id, saved.nombre, saved.despacho_id, antes, fichaAutoridad(saved));
    return saved;
  }

  async quitarAutoridad(user: AuthUser, id: number) {
    const row = await this.autoridadDe(user, id);
    if (await this.expedientes.exist({ where: { autoridad_id: id } })) {
      throw new BadRequestException('Esa autoridad ya está en un expediente.');
    }
    await this.anotar(user, 'baja', 'Autoridad', row.id, row.nombre, row.despacho_id, fichaAutoridad(row), null);
    await this.autoridades.delete({ id });
    return { ok: true };
  }

  async asuntosDe(user: AuthUser, clienteId?: number) {
    const despachoId = this.scope(user);
    return this.asuntos.find({
      where: { despacho_id: despachoId, ...(clienteId ? { cliente_id: clienteId } : {}) },
      order: { titulo: 'ASC' },
    });
  }

  async crearAsunto(user: AuthUser, dto: AsuntoDto) {
    const despachoId = this.scope(user);
    const cliente = await this.clientes.findOne({ where: { id: dto.cliente_id, despacho_id: despachoId, activo: true } });
    if (!cliente) throw new BadRequestException('Elige un cliente de este despacho.');
    const saved = await this.asuntos.save(
      this.asuntos.create({
        despacho_id: despachoId,
        cliente_id: cliente.id,
        titulo: dto.titulo.trim(),
        notas: dto.notas?.trim() || null,
        esquema: dto.esquema?.trim() || null,
        monto_acordado: dto.monto_acordado?.trim() || null,
      }),
    );
    await this.anotar(user, 'alta', 'Asunto', saved.id, saved.titulo, despachoId, null, { Título: saved.titulo, Cliente: nombreCliente(cliente) });
    return saved;
  }

  async editarAsunto(user: AuthUser, id: number, dto: AsuntoDto) {
    const row = await this.asuntoDe(user, id);
    const cliente = await this.clientes.findOne({ where: { id: dto.cliente_id, despacho_id: row.despacho_id, activo: true } });
    if (!cliente) throw new BadRequestException('Elige un cliente de este despacho.');
    const antes = { Título: row.titulo, Notas: row.notas };
    row.cliente_id = cliente.id;
    row.titulo = dto.titulo.trim();
    row.notas = dto.notas?.trim() || null;
    if (dto.esquema !== undefined) row.esquema = dto.esquema.trim() || null;
    if (dto.monto_acordado !== undefined) row.monto_acordado = dto.monto_acordado.trim() || null;
    const saved = await this.asuntos.save(row);
    await this.anotar(user, 'edicion', 'Asunto', saved.id, saved.titulo, saved.despacho_id, antes, { Título: saved.titulo, Notas: saved.notas });
    return saved;
  }

  async quitarAsunto(user: AuthUser, id: number) {
    const row = await this.asuntoDe(user, id);
    if (await this.expedientes.exist({ where: { asunto_id: id } })) {
      throw new BadRequestException('Ese asunto ya tiene expedientes.');
    }
    await this.anotar(user, 'baja', 'Asunto', row.id, row.titulo, row.despacho_id, { Título: row.titulo }, null);
    await this.asuntos.delete({ id });
    return { ok: true };
  }

  async tablero(user: AuthUser) {
    const despachoId = this.scope(user);
    const expedientes = await this.expedientes.find({ where: { despacho_id: despachoId }, order: { updated_at: 'DESC' } });
    const ids = expedientes.map((row) => row.id);
    if (!ids.length) return { terminos: [], actuaciones: [], inactividad: [] };
    const [terminos, promociones, escritos] = await Promise.all([
      this.terminos.find({ where: { expediente_id: In(ids), estado: 'pendiente' }, order: { vence_el: 'ASC' } }),
      this.promociones.find({ where: { expediente_id: In(ids) }, order: { presentada_el: 'DESC' } }),
      this.escritos.find({ where: { expediente_id: In(ids) }, order: { created_at: 'DESC' } }),
    ]);
    const porId = new Map(expedientes.map((row) => [row.id, row]));
    const limite = sumarDias(hoy(), 14);
    const terminosVisibles = terminos
      .filter((row) => dia(row.vence_el) <= limite)
      .slice(0, 20)
      .map((row) => {
        const expediente = porId.get(row.expediente_id);
        return {
          id: row.id,
          titulo: row.titulo,
          vence_el: dia(row.vence_el),
          expediente_id: row.expediente_id,
          expediente: expediente?.titulo ?? '',
          cliente: expediente?.cliente ?? '',
        };
      });
    const actuaciones = [
      ...promociones.map((row) => ({
        id: row.id,
        tipo: 'Promoción' as const,
        titulo: row.titulo,
        fecha: dia(row.presentada_el),
        expediente_id: row.expediente_id,
        expediente: porId.get(row.expediente_id)?.titulo ?? '',
      })),
      ...escritos.map((row) => ({
        id: row.id,
        tipo: 'Escrito' as const,
        titulo: row.titulo,
        fecha: dia(row.created_at),
        expediente_id: row.expediente_id,
        expediente: porId.get(row.expediente_id)?.titulo ?? '',
      })),
    ]
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, 8);
    const ultima = new Map<number, string>();
    for (const row of promociones) marcar(ultima, row.expediente_id, dia(row.presentada_el));
    for (const row of escritos) marcar(ultima, row.expediente_id, dia(row.created_at));
    const hoyDia = hoy();
    const inactividad = expedientes
      .map((row) => {
        const actuacion = ultima.get(row.id) ?? null;
        const desde = actuacion ?? dia(row.created_at);
        return {
          expediente_id: row.id,
          titulo: row.titulo,
          cliente: row.cliente,
          numero: numeroVisible(row),
          dias: diasEntre(desde, hoyDia),
          desde,
          origen: actuacion ? 'actuacion' : 'apertura',
        };
      })
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 12);
    return { terminos: terminosVisibles, actuaciones, inactividad };
  }

  private async catalogoDe(user: AuthUser, id: number) {
    const row = await this.catalogos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese registro.');
    this.mismo(user, row.despacho_id);
    return row;
  }

  private async autoridadDe(user: AuthUser, id: number) {
    const row = await this.autoridades.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa autoridad.');
    this.mismo(user, row.despacho_id);
    return row;
  }

  private async asuntoDe(user: AuthUser, id: number) {
    const row = await this.asuntos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese asunto.');
    this.mismo(user, row.despacho_id);
    return row;
  }

  private async catalogoOpcional(despachoId: number, id: number | null | undefined, tipo: TipoCatalogo) {
    if (id == null) return;
    const row = await this.catalogos.findOne({ where: { id, despacho_id: despachoId, tipo } });
    if (!row) throw new BadRequestException('Ese catálogo no pertenece a este despacho.');
  }

  private tipo(value: string): TipoCatalogo {
    const tipos = ['materia', 'jurisdiccion', 'instancia', 'estatus', 'sede'] as const;
    if ((tipos as readonly string[]).includes(value)) return value as TipoCatalogo;
    throw new BadRequestException('Ese tipo de catálogo no existe.');
  }

  private scope(user: AuthUser) {
    if (user.role === UserRole.DUENO || user.role === UserRole.PERSONAL) {
      throw new ForbiddenException('Estos catálogos se consultan desde el acceso del despacho.');
    }
    if (!user.despacho_id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');
    return user.despacho_id;
  }

  private mismo(user: AuthUser, despachoId: number) {
    if (this.scope(user) !== despachoId) throw new ForbiddenException('Ese registro es de otro despacho.');
  }

  private async anotar(
    user: AuthUser,
    tipo: TipoCambio,
    entidad: string,
    entidadId: number,
    referencia: string,
    despachoId: number,
    antes: Record<string, unknown> | null,
    despues: Record<string, unknown> | null,
  ) {
    const campos = tipo === 'alta' ? altaDe(despues ?? {}) : tipo === 'baja' ? bajaDe(antes ?? {}) : diffCampos(antes ?? {}, despues ?? {});
    if (!campos || !Object.keys(campos).length) return;
    await this.bitacora.registrar({ despachoId, entidad, entidadId, referencia, tipo, campos, actor: user });
  }
}

function fichaCatalogo(row: CatalogoJuridico) {
  return { Tipo: row.tipo, Nombre: row.nombre, Detalle: row.detalle, Teléfono: row.telefono };
}

function fichaAutoridad(row: Autoridad) {
  return { Nombre: row.nombre };
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

function diasEntre(desde: string, hasta: string) {
  const a = Date.parse(`${desde}T00:00:00`);
  const b = Date.parse(`${hasta}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function marcar(mapa: Map<number, string>, id: number, fecha: string) {
  const previa = mapa.get(id);
  if (!previa || previa < fecha) mapa.set(id, fecha);
}

function numeroVisible(row: Expediente) {
  if (row.numero && row.anio) return `${row.numero}/${row.anio}`;
  return row.folio;
}
