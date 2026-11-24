import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, bajaDe, diffCampos } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { TipoCambio } from '../entities/bitacora-edicion.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import {
  CreateEscritoDto,
  CreateExpedienteDto,
  CreatePromocionDto,
  CreateTerminoDto,
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
    private readonly bitacora: BitacoraService,
  ) {}

  async list(user: AuthUser, despachoId?: number) {
    const scope = this.scope(user, despachoId);
    const rows = await this.expedientes.find({
      where: scope ? { despacho_id: scope } : {},
      order: { updated_at: 'DESC' },
    });
    return rows;
  }

  async one(user: AuthUser, id: number) {
    const expediente = await this.owned(user, id);
    const [terminos, promociones, escritos] = await Promise.all([
      this.terminos.find({ where: { expediente_id: id }, order: { vence_el: 'ASC' } }),
      this.promociones.find({ where: { expediente_id: id }, order: { presentada_el: 'DESC' } }),
      this.escritos.find({ where: { expediente_id: id }, order: { updated_at: 'DESC' } }),
    ]);
    return { ...expediente, terminos, promociones, escritos };
  }

  async create(user: AuthUser, dto: CreateExpedienteDto) {
    const despachoId = this.scope(user);
    if (!despachoId) throw new ForbiddenException('Elige el despacho desde su propio acceso.');
    const saved = await this.expedientes.save(
      this.expedientes.create({
        despacho_id: despachoId,
        titulo: dto.titulo.trim(),
        cliente: dto.cliente.trim(),
        juzgado: dto.juzgado?.trim() || null,
        materia: dto.materia?.trim() || null,
      }),
    );
    await this.anotar(user, 'alta', 'Expediente', saved.id, saved.titulo, saved.despacho_id, null, fichaExpediente(saved));
    return saved;
  }

  async update(user: AuthUser, id: number, dto: UpdateExpedienteDto) {
    const expediente = await this.owned(user, id);
    const antes = fichaExpediente(expediente);
    expediente.titulo = dto.titulo.trim();
    expediente.cliente = dto.cliente.trim();
    expediente.juzgado = dto.juzgado?.trim() || null;
    expediente.materia = dto.materia?.trim() || null;
    const saved = await this.expedientes.save(expediente);
    await this.anotar(user, 'edicion', 'Expediente', saved.id, saved.titulo, saved.despacho_id, antes, fichaExpediente(saved));
    return saved;
  }

  async remove(user: AuthUser, id: number) {
    const expediente = await this.owned(user, id);
    await this.anotar(user, 'baja', 'Expediente', expediente.id, expediente.titulo, expediente.despacho_id, fichaExpediente(expediente), null);
    await this.terminos.delete({ expediente_id: id });
    await this.promociones.delete({ expediente_id: id });
    await this.escritos.delete({ expediente_id: id });
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

function fichaExpediente(row: Expediente) {
  return { Título: row.titulo, Cliente: row.cliente, Juzgado: row.juzgado, Materia: row.materia };
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
