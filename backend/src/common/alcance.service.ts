import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { Despacho } from '../entities/despacho.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { AuthUser } from './auth';
import { UserRole } from './enums';

@Injectable()
export class AlcanceService {
  constructor(
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    @InjectRepository(Aplicacion) private readonly aplicaciones: Repository<Aplicacion>,
    @InjectRepository(GrupoPermiso) private readonly permisos: Repository<GrupoPermiso>,
  ) {}

  async despachoDe(user: AuthUser, clave: string, requested?: number, accion: AccionAlcance = 'ver') {
    const propio = user.role === UserRole.ADMIN_DESPACHO || user.role === UserRole.MIEMBRO_DESPACHO;
    const id = propio ? user.despacho_id : requested;
    if (propio && !id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');
    if (!propio) await this.puede(user, clave, accion);
    if (!id) throw new BadRequestException('Elige el despacho.');
    const despacho = await this.despachos.findOne({ where: { id } });
    if (!despacho) throw new NotFoundException('No encontramos ese despacho.');
    return despacho;
  }

  esAdmin(user: AuthUser) {
    return user.role !== UserRole.MIEMBRO_DESPACHO;
  }

  private async puede(user: AuthUser, clave: string, accion: AccionAlcance) {
    if (user.role === UserRole.DUENO) return;
    if (user.role !== UserRole.PERSONAL || !user.grupo_id) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    const app = await this.aplicaciones.findOne({ where: { clave } });
    if (!app) throw new ForbiddenException('No tienes permiso para esta acción.');
    const permiso = await this.permisos.findOne({ where: { grupo_id: user.grupo_id, aplicacion_id: app.id } });
    if (!permiso || (accion !== 'ver' && !permiso[accion])) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
  }
}

type AccionAlcance = 'ver' | 'insertar' | 'actualizar' | 'eliminar';

export function centavos(value: number) {
  return Math.round(value * 100) / 100;
}

export function hoy() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
