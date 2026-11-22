import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
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
    return this.expedientes.save(
      this.expedientes.create({
        despacho_id: despachoId,
        titulo: dto.titulo.trim(),
        cliente: dto.cliente.trim(),
        juzgado: dto.juzgado?.trim() || null,
        materia: dto.materia?.trim() || null,
      }),
    );
  }

  async update(user: AuthUser, id: number, dto: UpdateExpedienteDto) {
    const expediente = await this.owned(user, id);
    expediente.titulo = dto.titulo.trim();
    expediente.cliente = dto.cliente.trim();
    expediente.juzgado = dto.juzgado?.trim() || null;
    expediente.materia = dto.materia?.trim() || null;
    return this.expedientes.save(expediente);
  }

  async remove(user: AuthUser, id: number) {
    await this.owned(user, id);
    await this.terminos.delete({ expediente_id: id });
    await this.promociones.delete({ expediente_id: id });
    await this.escritos.delete({ expediente_id: id });
    await this.expedientes.delete({ id });
    return { ok: true };
  }

  async addTermino(user: AuthUser, id: number, dto: CreateTerminoDto) {
    await this.owned(user, id);
    return this.terminos.save(
      this.terminos.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        vence_el: dto.vence_el.slice(0, 10),
        estado: dto.estado ?? 'pendiente',
        notas: dto.notas?.trim() || null,
      }),
    );
  }

  async updateTermino(user: AuthUser, id: number, dto: UpdateTerminoDto) {
    const row = await this.terminos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese término.');
    await this.owned(user, row.expediente_id);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.vence_el) row.vence_el = dto.vence_el.slice(0, 10);
    if (dto.estado) row.estado = dto.estado;
    if (dto.notas !== undefined) row.notas = dto.notas.trim() || null;
    return this.terminos.save(row);
  }

  async removeTermino(user: AuthUser, id: number) {
    const row = await this.terminos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese término.');
    await this.owned(user, row.expediente_id);
    await this.terminos.delete({ id });
    return { ok: true };
  }

  async addPromocion(user: AuthUser, id: number, dto: CreatePromocionDto) {
    await this.owned(user, id);
    return this.promociones.save(
      this.promociones.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        juzgado: dto.juzgado?.trim() || null,
        presentada_el: dto.presentada_el.slice(0, 10),
        notas: dto.notas?.trim() || null,
        archivo_url: dto.archivo_url?.trim() || null,
      }),
    );
  }

  async updatePromocion(user: AuthUser, id: number, dto: UpdatePromocionDto) {
    const row = await this.promociones.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa promoción.');
    await this.owned(user, row.expediente_id);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.juzgado !== undefined) row.juzgado = dto.juzgado.trim() || null;
    if (dto.presentada_el) row.presentada_el = dto.presentada_el.slice(0, 10);
    if (dto.notas !== undefined) row.notas = dto.notas.trim() || null;
    if (dto.archivo_url !== undefined) row.archivo_url = dto.archivo_url.trim() || null;
    return this.promociones.save(row);
  }

  async removePromocion(user: AuthUser, id: number) {
    const row = await this.promociones.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos esa promoción.');
    await this.owned(user, row.expediente_id);
    await this.promociones.delete({ id });
    return { ok: true };
  }

  async addEscrito(user: AuthUser, id: number, dto: CreateEscritoDto) {
    await this.owned(user, id);
    return this.escritos.save(
      this.escritos.create({
        expediente_id: id,
        titulo: dto.titulo.trim(),
        cuerpo: dto.cuerpo?.trim() || null,
        estado: dto.estado ?? 'borrador',
        archivo_url: dto.archivo_url?.trim() || null,
      }),
    );
  }

  async updateEscrito(user: AuthUser, id: number, dto: UpdateEscritoDto) {
    const row = await this.escritos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese escrito.');
    await this.owned(user, row.expediente_id);
    if (dto.titulo) row.titulo = dto.titulo.trim();
    if (dto.cuerpo !== undefined) row.cuerpo = dto.cuerpo.trim() || null;
    if (dto.estado) row.estado = dto.estado;
    if (dto.archivo_url !== undefined) row.archivo_url = dto.archivo_url.trim() || null;
    return this.escritos.save(row);
  }

  async removeEscrito(user: AuthUser, id: number) {
    const row = await this.escritos.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos ese escrito.');
    await this.owned(user, row.expediente_id);
    await this.escritos.delete({ id });
    return { ok: true };
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
