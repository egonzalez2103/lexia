import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { Aplicacion } from '../entities/aplicacion.entity';
import { BitacoraEdicion, CampoEdicion, TipoCambio } from '../entities/bitacora-edicion.entity';
import { Despacho } from '../entities/despacho.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { ENTIDADES, TIPOS_CAMBIO, resumirCampos } from './cambios';

export type RegistrarEdicion = {
  despachoId: number | null;
  entidad: string;
  entidadId: number;
  referencia: string;
  tipo: TipoCambio;
  campos: Record<string, CampoEdicion>;
  actor: Pick<AuthUser, 'id' | 'name'>;
};

export type ListarEdiciones = {
  page: number;
  pageSize: number;
  q?: string;
  entidad?: string;
  usuario?: string;
  despachoId?: number;
  desde?: string;
  hasta?: string;
};

@Injectable()
export class BitacoraService {
  constructor(
    @InjectRepository(BitacoraEdicion) private readonly filas: Repository<BitacoraEdicion>,
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    @InjectRepository(Aplicacion) private readonly aplicaciones: Repository<Aplicacion>,
    @InjectRepository(GrupoPermiso) private readonly permisos: Repository<GrupoPermiso>,
  ) {}

  async registrar(input: RegistrarEdicion, manager?: EntityManager) {
    if (!Object.keys(input.campos).length) return;
    const filas = manager ? manager.getRepository(BitacoraEdicion) : this.filas;
    await filas.save(
      filas.create({
        despacho_id: input.despachoId,
        entidad: input.entidad,
        entidad_id: input.entidadId,
        referencia: input.referencia.trim().slice(0, 180) || 'Sin referencia',
        tipo_cambio: input.tipo,
        campos: input.campos,
        usuario_id: input.actor.id,
        usuario: input.actor.name.trim().slice(0, 160) || 'Usuario',
      }),
    );
  }

  async listar(user: AuthUser, query: ListarEdiciones) {
    await this.puedeVer(user);
    const propio = user.role === UserRole.ADMIN_DESPACHO || user.role === UserRole.MIEMBRO_DESPACHO;
    if (propio && !user.despacho_id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const qb = this.filas.createQueryBuilder('b');
    if (propio) qb.andWhere('b.despacho_id = :despachoId', { despachoId: user.despacho_id });
    else if (query.despachoId === 0) qb.andWhere('b.despacho_id IS NULL');
    else if (query.despachoId) qb.andWhere('b.despacho_id = :despachoId', { despachoId: query.despachoId });
    if (query.entidad) qb.andWhere('b.entidad = :entidad', { entidad: query.entidad });
    if (query.usuario) qb.andWhere('b.usuario LIKE :usuario', { usuario: `%${query.usuario.slice(0, 80)}%` });
    if (query.q) {
      qb.andWhere('(b.referencia LIKE :q OR b.usuario LIKE :q OR CAST(b.campos AS CHAR) LIKE :q)', {
        q: `%${query.q.slice(0, 80)}%`,
      });
    }
    if (query.desde) qb.andWhere('DATE(b.fecha) >= :desde', { desde: query.desde });
    if (query.hasta) qb.andWhere('DATE(b.fecha) <= :hasta', { hasta: query.hasta });

    const [rows, total] = await qb
      .orderBy('b.fecha', 'DESC')
      .addOrderBy('b.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const ids = [...new Set(rows.map((row) => row.despacho_id).filter((id): id is number => id != null))];
    const despachos = ids.length ? await this.despachos.findBy({ id: In(ids) }) : [];
    const nombreDe = new Map(despachos.map((despacho) => [despacho.id, despacho.name]));

    return {
      data: rows.map((row) => ({
        id: row.id,
        despacho_id: row.despacho_id,
        despacho: row.despacho_id ? (nombreDe.get(row.despacho_id) ?? 'Despacho') : 'Plataforma',
        entidad: row.entidad,
        entidad_etiqueta: ENTIDADES[row.entidad] ?? row.entidad,
        entidad_id: row.entidad_id,
        referencia: row.referencia,
        tipo_cambio: row.tipo_cambio,
        tipo_etiqueta: TIPOS_CAMBIO[row.tipo_cambio] ?? row.tipo_cambio,
        usuario: row.usuario,
        fecha: row.fecha,
        resumen: resumirCampos(row.campos),
        campos: row.campos,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      entidades: Object.entries(ENTIDADES).map(([valor, etiqueta]) => ({ valor, etiqueta })),
      alcance: propio ? 'despacho' : 'plataforma',
    };
  }

  private async puedeVer(user: AuthUser) {
    if (user.role === UserRole.DUENO || user.role === UserRole.ADMIN_DESPACHO) return;
    if (user.role === UserRole.MIEMBRO_DESPACHO) {
      throw new ForbiddenException('El registro de ediciones lo consulta la administración del despacho.');
    }
    if (user.role !== UserRole.PERSONAL || !user.grupo_id) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    const app = await this.aplicaciones.findOne({ where: { clave: 'registro-ediciones' } });
    if (!app) throw new ForbiddenException('No tienes permiso para esta acción.');
    const permiso = await this.permisos.findOne({ where: { grupo_id: user.grupo_id, aplicacion_id: app.id } });
    if (!permiso) throw new ForbiddenException('No tienes permiso para esta acción.');
  }
}

export function parseFecha(nombre: string, raw?: string) {
  const value = raw?.trim();
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException(`La fecha "${nombre}" debe ir como AAAA-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) throw new BadRequestException(`La fecha "${nombre}" no existe.`);
  return value;
}
