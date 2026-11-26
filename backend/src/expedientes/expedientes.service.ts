import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe, diffCampos } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { Asunto } from '../entities/asunto.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { TipoCambio } from '../entities/bitacora-edicion.entity';
import { CatalogoJuridico, TipoCatalogo } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { Parte } from '../entities/parte.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { VinculoExpediente } from '../entities/vinculo-expediente.entity';
import {
  CreateEscritoDto,
  CreateExpedienteDto,
  CreateParteDto,
  CreatePromocionDto,
  CreateTerminoDto,
  CreateVinculoDto,
  UpdateEscritoDto,
  UpdateExpedienteDto,
  UpdatePromocionDto,
  UpdateTerminoDto,
} from './dto';

@Injectable()
export class ExpedientesService {
  constructor(
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(Termino) private readonly terminos: Repository<Termino>,
    @InjectRepository(Promocion) private readonly promociones: Repository<Promocion>,
    @InjectRepository(Escrito) private readonly escritos: Repository<Escrito>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Asunto) private readonly asuntos: Repository<Asunto>,
    @InjectRepository(CatalogoJuridico) private readonly catalogos: Repository<CatalogoJuridico>,
    @InjectRepository(Autoridad) private readonly autoridades: Repository<Autoridad>,
    @InjectRepository(Parte) private readonly partes: Repository<Parte>,
    @InjectRepository(VinculoExpediente) private readonly vinculos: Repository<VinculoExpediente>,
    private readonly bitacora: BitacoraService,
  ) {}

  async list(user: AuthUser, despachoId?: number) {
    const scope = this.scope(user, despachoId);
    const rows = await this.expedientes.find({
      where: scope ? { despacho_id: scope } : {},
      order: { updated_at: 'DESC' },
    });
    return this.adornar(rows);
  }

  async one(user: AuthUser, id: number) {
    const expediente = await this.owned(user, id);
    const [terminos, promociones, escritos, partes, vinculos, adorno] = await Promise.all([
      this.terminos.find({ where: { expediente_id: id }, order: { vence_el: 'ASC' } }),
      this.promociones.find({ where: { expediente_id: id }, order: { presentada_el: 'DESC' } }),
      this.escritos.find({ where: { expediente_id: id }, order: { updated_at: 'DESC' } }),
      this.partes.find({ where: { expediente_id: id }, order: { id: 'ASC' } }),
      this.vinculos.find({ where: { expediente_id: id }, order: { id: 'ASC' } }),
      this.adornar([expediente]).then((rows) => rows[0]),
    ]);
    const relacionados = vinculos.length
      ? await this.expedientes.find({ where: { id: In(vinculos.map((row) => row.relacionado_id)) } })
      : [];
    const porId = new Map(relacionados.map((row) => [row.id, row]));
    return {
      ...adorno,
      terminos,
      promociones,
      escritos,
      partes,
      vinculos: vinculos.map((row) => ({
        id: row.id,
        tipo: row.tipo,
        relacionado_id: row.relacionado_id,
        relacionado: porId.get(row.relacionado_id)
          ? {
              id: row.relacionado_id,
              titulo: porId.get(row.relacionado_id)?.titulo,
              numero: porId.get(row.relacionado_id)?.numero,
              anio: porId.get(row.relacionado_id)?.anio,
              folio: porId.get(row.relacionado_id)?.folio,
            }
          : null,
      })),
    };
  }

  async create(user: AuthUser, dto: CreateExpedienteDto) {
    const despachoId = this.scope(user);
    if (!despachoId) throw new ForbiddenException('Elige el despacho desde su propio acceso.');
    const row = this.expedientes.create({
      despacho_id: despachoId,
      titulo: dto.titulo.trim(),
      cliente: '',
    });
    await this.rellenar(row, dto);
    if (!row.cliente.trim()) throw new BadRequestException('Elige el cliente.');
    const saved = await this.expedientes.save(row);
    saved.folio = `${new Date().getFullYear()}-${String(saved.id).padStart(6, '0')}`;
    const conFolio = await this.expedientes.save(saved);
    await this.anotar(user, 'alta', 'Expediente', conFolio.id, conFolio.titulo, conFolio.despacho_id, null, fichaExpediente(conFolio));
    return (await this.adornar([conFolio]))[0];
  }

  async update(user: AuthUser, id: number, dto: UpdateExpedienteDto) {
    const expediente = await this.owned(user, id);
    const antes = fichaExpediente(expediente);
    if (dto.titulo) expediente.titulo = dto.titulo.trim();
    await this.rellenar(expediente, dto);
    if (!expediente.cliente.trim()) throw new BadRequestException('Elige el cliente.');
    const saved = await this.expedientes.save(expediente);
    await this.anotar(user, 'edicion', 'Expediente', saved.id, saved.titulo, saved.despacho_id, antes, fichaExpediente(saved));
    return (await this.adornar([saved]))[0];
  }

  async remove(user: AuthUser, id: number) {
    const expediente = await this.owned(user, id);
    await this.anotar(user, 'baja', 'Expediente', expediente.id, expediente.titulo, expediente.despacho_id, fichaExpediente(expediente), null);
    await this.terminos.delete({ expediente_id: id });
    await this.promociones.delete({ expediente_id: id });
    await this.escritos.delete({ expediente_id: id });
    await this.partes.delete({ expediente_id: id });
    await this.vinculos.delete({ expediente_id: id });
    await this.vinculos.delete({ relacionado_id: id });
    await this.expedientes.delete({ id });
    return { ok: true };
  }

  async addTermino(user: AuthUser, id: number, dto: CreateTerminoDto) {
    const expediente = await this.owned(user, id);
    const row = await this.terminos.save(
      this.terminos.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        vence_el: dto.vence_el.slice(0, 10),
        estado: dto.estado ?? 'pendiente',
        notas: dto.notas?.trim() || null,
      }),
    );
    await this.anotar(user, 'alta', 'Termino', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, null, fichaTermino(row));
    return row;
  }

  async updateTermino(user: AuthUser, id: number, dto: UpdateTerminoDto) {
    const row = await this.terminos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese término.');
    const expediente = await this.owned(user, row.expediente_id);
    const antes = fichaTermino(row);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.vence_el) row.vence_el = dto.vence_el.slice(0, 10);
    if (dto.estado) row.estado = dto.estado;
    if (dto.notas !== undefined) row.notas = dto.notas.trim() || null;
    const saved = await this.terminos.save(row);
    await this.anotar(user, 'edicion', 'Termino', saved.id, `${expediente.titulo} · ${saved.titulo}`, expediente.despacho_id, antes, fichaTermino(saved));
    return saved;
  }

  async removeTermino(user: AuthUser, id: number) {
    const row = await this.terminos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese término.');
    const expediente = await this.owned(user, row.expediente_id);
    await this.anotar(user, 'baja', 'Termino', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, fichaTermino(row), null);
    await this.terminos.delete({ id });
    return { ok: true };
  }

  async addPromocion(user: AuthUser, id: number, dto: CreatePromocionDto) {
    const expediente = await this.owned(user, id);
    const row = await this.promociones.save(
      this.promociones.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        juzgado: dto.juzgado?.trim() || null,
        presentada_el: dto.presentada_el.slice(0, 10),
        notas: dto.notas?.trim() || null,
        archivo_url: dto.archivo_url?.trim() || null,
      }),
    );
    await this.anotar(user, 'alta', 'Promocion', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, null, fichaPromocion(row));
    return row;
  }

  async updatePromocion(user: AuthUser, id: number, dto: UpdatePromocionDto) {
    const row = await this.promociones.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa promoción.');
    const expediente = await this.owned(user, row.expediente_id);
    const antes = fichaPromocion(row);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.juzgado !== undefined) row.juzgado = dto.juzgado.trim() || null;
    if (dto.presentada_el) row.presentada_el = dto.presentada_el.slice(0, 10);
    if (dto.notas !== undefined) row.notas = dto.notas.trim() || null;
    if (dto.archivo_url !== undefined) row.archivo_url = dto.archivo_url.trim() || null;
    const saved = await this.promociones.save(row);
    await this.anotar(user, 'edicion', 'Promocion', saved.id, `${expediente.titulo} · ${saved.titulo}`, expediente.despacho_id, antes, fichaPromocion(saved));
    return saved;
  }

  async removePromocion(user: AuthUser, id: number) {
    const row = await this.promociones.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa promoción.');
    const expediente = await this.owned(user, row.expediente_id);
    await this.anotar(user, 'baja', 'Promocion', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, fichaPromocion(row), null);
    await this.promociones.delete({ id });
    return { ok: true };
  }

  async addEscrito(user: AuthUser, id: number, dto: CreateEscritoDto) {
    const expediente = await this.owned(user, id);
    const row = await this.escritos.save(
      this.escritos.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        cuerpo: dto.cuerpo?.trim() || null,
        estado: dto.estado ?? 'borrador',
        archivo_url: dto.archivo_url?.trim() || null,
      }),
    );
    await this.anotar(user, 'alta', 'Escrito', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, null, fichaEscrito(row));
    return row;
  }

  async updateEscrito(user: AuthUser, id: number, dto: UpdateEscritoDto) {
    const row = await this.escritos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese escrito.');
    const expediente = await this.owned(user, row.expediente_id);
    const antes = fichaEscrito(row);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.cuerpo !== undefined) row.cuerpo = dto.cuerpo.trim() || null;
    if (dto.estado) row.estado = dto.estado;
    if (dto.archivo_url !== undefined) row.archivo_url = dto.archivo_url.trim() || null;
    const saved = await this.escritos.save(row);
    await this.anotar(user, 'edicion', 'Escrito', saved.id, `${expediente.titulo} · ${saved.titulo}`, expediente.despacho_id, antes, fichaEscrito(saved));
    return saved;
  }

  async removeEscrito(user: AuthUser, id: number) {
    const row = await this.escritos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese escrito.');
    const expediente = await this.owned(user, row.expediente_id);
    await this.anotar(user, 'baja', 'Escrito', row.id, `${expediente.titulo} · ${row.titulo}`, expediente.despacho_id, fichaEscrito(row), null);
    await this.escritos.delete({ id });
    return { ok: true };
  }

  async addParte(user: AuthUser, id: number, dto: CreateParteDto) {
    const expediente = await this.owned(user, id);
    const row = await this.partes.save(
      this.partes.create({
        expediente_id: id,
        nombre: dto.nombre.trim(),
        caracter: dto.caracter.trim(),
      }),
    );
    await this.anotar(user, 'alta', 'Parte', row.id, `${expediente.titulo} · ${row.nombre}`, expediente.despacho_id, null, {
      Nombre: row.nombre,
      Carácter: row.caracter,
    });
    return row;
  }

  async removeParte(user: AuthUser, id: number) {
    const row = await this.partes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa parte.');
    const expediente = await this.owned(user, row.expediente_id);
    await this.anotar(user, 'baja', 'Parte', row.id, `${expediente.titulo} · ${row.nombre}`, expediente.despacho_id, { Nombre: row.nombre, Carácter: row.caracter }, null);
    await this.partes.delete({ id });
    return { ok: true };
  }

  async addVinculo(user: AuthUser, id: number, dto: CreateVinculoDto) {
    const expediente = await this.owned(user, id);
    if (dto.relacionado_id === id) throw new BadRequestException('Un expediente no se vincula consigo mismo.');
    const relacionado = await this.expedientes.findOne({ where: { id: dto.relacionado_id, despacho_id: expediente.despacho_id } });
    if (!relacionado) throw new BadRequestException('El expediente vinculado es de otro despacho.');
    const existe = await this.vinculos.exist({ where: { expediente_id: id, relacionado_id: dto.relacionado_id, tipo: dto.tipo } });
    if (existe) throw new BadRequestException('Ese vínculo ya está registrado.');
    const row = await this.vinculos.save(
      this.vinculos.create({ expediente_id: id, relacionado_id: relacionado.id, tipo: dto.tipo }),
    );
    await this.anotar(user, 'alta', 'Vinculo', row.id, `${expediente.titulo} · ${dto.tipo}`, expediente.despacho_id, null, {
      Tipo: dto.tipo,
      Expediente: relacionado.titulo,
    });
    return row;
  }

  async removeVinculo(user: AuthUser, id: number) {
    const row = await this.vinculos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese vínculo.');
    const expediente = await this.owned(user, row.expediente_id);
    await this.anotar(user, 'baja', 'Vinculo', row.id, `${expediente.titulo} · ${row.tipo}`, expediente.despacho_id, { Tipo: row.tipo }, null);
    await this.vinculos.delete({ id });
    return { ok: true };
  }

  private async rellenar(expediente: Expediente, dto: CreateExpedienteDto | UpdateExpedienteDto) {
    const despachoId = expediente.despacho_id;
    if (dto.asunto_id) {
      const asunto = await this.asuntos.findOne({ where: { id: dto.asunto_id, despacho_id: despachoId } });
      if (!asunto) throw new BadRequestException('Ese asunto no pertenece a este despacho.');
      if (dto.cliente_id && dto.cliente_id !== asunto.cliente_id) throw new BadRequestException('El asunto es de otro cliente.');
      const cliente = await this.clientes.findOne({ where: { id: asunto.cliente_id, despacho_id: despachoId } });
      if (!cliente) throw new BadRequestException('El cliente de ese asunto ya no está en el despacho.');
      expediente.asunto_id = asunto.id;
      expediente.cliente_id = cliente.id;
      expediente.cliente = nombreCliente(cliente).slice(0, 160);
    } else if (dto.cliente_id) {
      const cliente = await this.clientes.findOne({ where: { id: dto.cliente_id, despacho_id: despachoId, activo: true } });
      if (!cliente) throw new BadRequestException('Elige un cliente de este despacho.');
      expediente.cliente_id = cliente.id;
      expediente.cliente = nombreCliente(cliente).slice(0, 160);
      if (dto.asunto_id === null) expediente.asunto_id = null;
    } else if (dto.cliente?.trim()) {
      expediente.cliente = dto.cliente.trim();
    }
    if (dto.numero !== undefined) expediente.numero = dto.numero?.trim() || null;
    if (dto.anio !== undefined) expediente.anio = dto.anio ?? null;
    if (dto.etapa !== undefined) expediente.etapa = dto.etapa?.trim() || null;
    if (dto.juzgado !== undefined && dto.autoridad_id === undefined) expediente.juzgado = dto.juzgado?.trim() || null;
    if (dto.materia !== undefined && dto.materia_id === undefined) expediente.materia = dto.materia?.trim() || null;
    await this.aplicarCatalogo(expediente, 'autoridad_id', dto.autoridad_id);
    await this.aplicarCatalogo(expediente, 'sede_id', dto.sede_id, 'sede');
    await this.aplicarCatalogo(expediente, 'jurisdiccion_id', dto.jurisdiccion_id, 'jurisdiccion');
    await this.aplicarCatalogo(expediente, 'materia_id', dto.materia_id, 'materia');
    await this.aplicarCatalogo(expediente, 'instancia_id', dto.instancia_id, 'instancia');
    await this.aplicarCatalogo(expediente, 'estatus_id', dto.estatus_id, 'estatus');
  }

  private async aplicarCatalogo(
    expediente: Expediente,
    campo: 'autoridad_id' | 'sede_id' | 'jurisdiccion_id' | 'materia_id' | 'instancia_id' | 'estatus_id',
    id: number | null | undefined,
    tipo?: TipoCatalogo,
  ) {
    if (id === undefined) return;
    if (id === null) {
      expediente[campo] = null;
      if (campo === 'materia_id') expediente.materia = null;
      if (campo === 'autoridad_id') expediente.juzgado = null;
      return;
    }
    if (campo === 'autoridad_id') {
      const autoridad = await this.autoridades.findOne({ where: { id, despacho_id: expediente.despacho_id } });
      if (!autoridad) throw new BadRequestException('Esa autoridad no pertenece a este despacho.');
      expediente.autoridad_id = autoridad.id;
      expediente.juzgado = autoridad.nombre;
      return;
    }
    const catalogo = await this.catalogos.findOne({ where: { id, despacho_id: expediente.despacho_id, tipo } });
    if (!catalogo) throw new BadRequestException('Ese catálogo no pertenece a este despacho.');
    expediente[campo] = catalogo.id;
    if (campo === 'materia_id') expediente.materia = catalogo.nombre.slice(0, 160);
  }

  private async adornar(rows: Expediente[]) {
    const catalogoIds = rows.flatMap((row) => [row.sede_id, row.jurisdiccion_id, row.materia_id, row.instancia_id, row.estatus_id].filter((id): id is number => id != null));
    const autoridadIds = rows.map((row) => row.autoridad_id).filter((id): id is number => id != null);
    const asuntoIds = rows.map((row) => row.asunto_id).filter((id): id is number => id != null);
    const [catalogos, autoridades, asuntos] = await Promise.all([
      catalogoIds.length ? this.catalogos.find({ where: { id: In(catalogoIds) } }) : Promise.resolve([]),
      autoridadIds.length ? this.autoridades.find({ where: { id: In(autoridadIds) } }) : Promise.resolve([]),
      asuntoIds.length ? this.asuntos.find({ where: { id: In(asuntoIds) } }) : Promise.resolve([]),
    ]);
    const catalogo = new Map(catalogos.map((row) => [row.id, row.nombre]));
    const autoridad = new Map(autoridades.map((row) => [row.id, row.nombre]));
    const asunto = new Map(asuntos.map((row) => [row.id, row.titulo]));
    return rows.map((row) => ({
      ...row,
      asunto: row.asunto_id ? (asunto.get(row.asunto_id) ?? null) : null,
      autoridad: row.autoridad_id ? (autoridad.get(row.autoridad_id) ?? row.juzgado) : row.juzgado,
      sede: row.sede_id ? (catalogo.get(row.sede_id) ?? null) : null,
      jurisdiccion: row.jurisdiccion_id ? (catalogo.get(row.jurisdiccion_id) ?? null) : null,
      materia_nombre: row.materia_id ? (catalogo.get(row.materia_id) ?? row.materia) : row.materia,
      instancia: row.instancia_id ? (catalogo.get(row.instancia_id) ?? null) : null,
      estatus: row.estatus_id ? (catalogo.get(row.estatus_id) ?? null) : null,
    }));
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
    await this.bitacora.registrar({
      despachoId,
      entidad,
      entidadId,
      referencia,
      tipo,
      campos,
      actor: user,
    });
  }

  private scope(user: AuthUser, requested?: number) {
    if (user.role === UserRole.DUENO) return requested;
    if (!user.despacho_id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');
    return user.despacho_id;
  }

  private async owned(user: AuthUser, id: number) {
    const expediente = await this.expedientes.findOne({ where: { id } });
    if (!expediente) throw new NotFoundException('No encontramos ese expediente.');
    if (user.role !== UserRole.DUENO && expediente.despacho_id !== user.despacho_id) {
      throw new ForbiddenException('Ese expediente es de otro despacho.');
    }
    return expediente;
  }
}

function dia(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

function nombreCliente(row: Pick<Cliente, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function fichaExpediente(row: Expediente) {
  return {
    Título: row.titulo,
    Folio: row.folio,
    Cliente: row.cliente,
    Número: row.numero && row.anio ? `${row.numero}/${row.anio}` : row.numero,
    Etapa: row.etapa,
    Juzgado: row.juzgado,
    Materia: row.materia,
  };
}

function fichaTermino(row: Termino) {
  return { Título: row.titulo, Vence: dia(row.vence_el), Estado: row.estado, Notas: row.notas };
}

function fichaPromocion(row: Promocion) {
  return {
    Título: row.titulo,
    Juzgado: row.juzgado,
    Presentada: dia(row.presentada_el),
    Notas: row.notas,
    Archivo: row.archivo_url ? 'Adjunto' : null,
  };
}

function fichaEscrito(row: Escrito) {
  return { Título: row.titulo, Estado: row.estado, Cuerpo: row.cuerpo, Archivo: row.archivo_url ? 'Adjunto' : null };
}
