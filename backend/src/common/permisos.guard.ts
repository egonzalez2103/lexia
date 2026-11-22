import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { AuthUser } from './auth';
import { UserRole } from './enums';
import { APP_KEY, MetaPermiso } from './permiso';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(GrupoPermiso) private readonly permisos: Repository<GrupoPermiso>,
    @InjectRepository(Aplicacion) private readonly aplicaciones: Repository<Aplicacion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<MetaPermiso>(APP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) return true;
    if (user.role === UserRole.DUENO) return true;
    if (user.role !== UserRole.PERSONAL || !user.grupo_id) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    const apps = await this.aplicaciones.find();
    const permitidas = new Set(apps.filter((app) => meta.claves.includes(app.clave)).map((app) => app.id));
    const filas = await this.permisos.find({ where: { grupo_id: user.grupo_id } });
    const permiso = filas.find((fila) => permitidas.has(fila.aplicacion_id));
    if (!permiso) throw new ForbiddenException('No tienes permiso para esta acción.');
    if (meta.accion !== 'ver' && !permiso[meta.accion]) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}
