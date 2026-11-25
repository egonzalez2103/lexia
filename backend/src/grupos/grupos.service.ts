import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { Aplicacion } from '../entities/aplicacion.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { User } from '../entities/user.entity';
import { GrupoDto, PermisoDto } from './dto';

const APLICACIONES = [
  { clave: 'despachos', nombre: 'Despachos', descripcion: 'Alta y suspensión de despachos', categoria: 'Administración' },
  { clave: 'colaboradores', nombre: 'Colaboradores', descripcion: 'Personal, sueldo y acceso', categoria: 'Recursos humanos' },
  { clave: 'tipos-colaborador', nombre: 'Tipos de colaborador', descripcion: 'Catálogo de puestos', categoria: 'Catálogos' },
  { clave: 'grupos', nombre: 'Permisos', descripcion: 'Grupos y los módulos que puede ver cada uno', categoria: 'Administración' },
  { clave: 'caja', nombre: 'Control de cajas', descripcion: 'Caja chica y caja general', categoria: 'Control de cajas' },
  { clave: 'nominas', nombre: 'Nóminas', descripcion: 'Pago semanal de lunes a domingo', categoria: 'Nóminas' },
  { clave: 'reportes', nombre: 'Reportes', descripcion: 'Resumen de la operación', categoria: 'Reportes' },
  { clave: 'registro-ediciones', nombre: 'Registro de ediciones', descripcion: 'Consulta de altas, cambios y bajas', categoria: 'Administración' },
  { clave: 'movimientos', nombre: 'Movimientos', descripcion: 'Catálogo, registro y caja del día del despacho', categoria: 'Control de cajas' },
  { clave: 'caja-general', nombre: 'Caja general', descripcion: 'Caja general y cuadre de caja chica', categoria: 'Control de cajas' },
  { clave: 'clientes', nombre: 'Clientes', descripcion: 'Cartera de clientes del despacho', categoria: 'Del despacho' },
  { clave: 'comisiones', nombre: 'Comisiones', descripcion: 'Comisiones de los abogados del despacho', categoria: 'Del despacho' },
];

@Injectable()
export class GruposService implements OnModuleInit {
  constructor(
    @InjectRepository(Grupo) private readonly grupos: Repository<Grupo>,
    @InjectRepository(Aplicacion) private readonly aplicaciones: Repository<Aplicacion>,
    @InjectRepository(GrupoPermiso) private readonly permisos: Repository<GrupoPermiso>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TipoColaborador) private readonly tipos: Repository<TipoColaborador>,
  ) {}

  async onModuleInit() {
    for (const app of APLICACIONES) {
      const actual = await this.aplicaciones.findOne({ where: { clave: app.clave } });
      if (!actual) await this.aplicaciones.save(this.aplicaciones.create(app));
      else await this.aplicaciones.save({ ...actual, ...app });
    }
  }

  list() {
    return this.grupos.find({ order: { nombre: 'ASC' } });
  }

  aplicacionesDe() {
    return this.aplicaciones.find({ order: { categoria: 'ASC', nombre: 'ASC' } });
  }

  async permisosDeGrupo(grupoId: number) {
    await this.find(grupoId);
    const [filas, apps] = await Promise.all([
      this.permisos.find({ where: { grupo_id: grupoId }, order: { id: 'ASC' } }),
      this.aplicaciones.find(),
    ]);
    const appDe = new Map(apps.map((app) => [app.id, app]));
    return filas.map((fila) => ({
      ...fila,
      aplicacion: appDe.get(fila.aplicacion_id) ?? null,
    }));
  }

  async create(dto: GrupoDto) {
    const nombre = dto.nombre.trim();
    const tomado = await this.grupos.findOne({ where: { nombre } });
    if (tomado) throw new ConflictException(`Ya existe el grupo «${nombre}».`);
    return this.grupos.save(this.grupos.create({ nombre, descripcion: dto.descripcion.trim() }));
  }

  async update(id: number, dto: GrupoDto) {
    const grupo = await this.find(id);
    const nombre = dto.nombre.trim();
    const tomado = await this.grupos.findOne({ where: { nombre } });
    if (tomado && tomado.id !== id) throw new ConflictException(`Ya existe el grupo «${nombre}».`);
    grupo.nombre = nombre;
    grupo.descripcion = dto.descripcion.trim();
    return this.grupos.save(grupo);
  }

  async remove(id: number) {
    await this.find(id);
    const usuarios = await this.users.count({ where: { grupo_id: id } });
    const puestos = await this.tipos.count({ where: { grupo_id: id } });
    if (usuarios || puestos) {
      throw new ConflictException('Ese grupo está asignado a un puesto o a un usuario.');
    }
    await this.permisos.delete({ grupo_id: id });
    await this.grupos.delete(id);
    return { ok: true };
  }

  async guardarPermiso(grupoId: number, dto: PermisoDto) {
    await this.find(grupoId);
    const app = await this.aplicaciones.findOne({ where: { id: dto.aplicacion_id } });
    if (!app) throw new NotFoundException('No encontramos ese módulo.');
    let fila = await this.permisos.findOne({ where: { grupo_id: grupoId, aplicacion_id: app.id } });
    if (!fila) fila = this.permisos.create({ grupo_id: grupoId, aplicacion_id: app.id });
    fila.insertar = dto.insertar === true;
    fila.actualizar = dto.actualizar === true;
    fila.eliminar = dto.eliminar === true;
    return this.permisos.save(fila);
  }

  async quitarPermiso(grupoId: number, aplicacionId: number) {
    await this.permisos.delete({ grupo_id: grupoId, aplicacion_id: aplicacionId });
    return { ok: true };
  }

  async permisosDe(user: { role: UserRole; grupo_id: number | null }) {
    const apps = await this.aplicaciones.find({ order: { nombre: 'ASC' } });
    if (user.role === UserRole.DUENO) {
      return apps.map((app) => ({ clave: app.clave, insertar: true, actualizar: true, eliminar: true }));
    }
    if (!user.grupo_id) return [];
    const filas = await this.permisos.find({ where: { grupo_id: user.grupo_id } });
    const appDe = new Map(apps.map((app) => [app.id, app]));
    return filas.flatMap((fila) => {
      const app = appDe.get(fila.aplicacion_id);
      if (!app) return [];
      return [{ clave: app.clave, insertar: fila.insertar, actualizar: fila.actualizar, eliminar: fila.eliminar }];
    });
  }

  private async find(id: number) {
    const grupo = await this.grupos.findOne({ where: { id } });
    if (!grupo) throw new NotFoundException('No encontramos ese grupo.');
    return grupo;
  }
}
