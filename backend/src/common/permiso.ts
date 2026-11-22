import { SetMetadata } from '@nestjs/common';

export const APP_KEY = 'app';
export type AccionPermiso = 'ver' | 'insertar' | 'actualizar' | 'eliminar';

export type MetaPermiso = { claves: string[]; accion: AccionPermiso };

export const AppPermiso = (clave: string | string[], accion: AccionPermiso = 'ver') =>
  SetMetadata(APP_KEY, { claves: Array.isArray(clave) ? clave : [clave], accion } satisfies MetaPermiso);
