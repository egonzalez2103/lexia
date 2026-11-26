import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from './auth';
import { UserRole } from './enums';

export function esDireccion(user: AuthUser) {
  return user.role === UserRole.ADMIN_DESPACHO || user.role === UserRole.DUENO;
}

export function funcionEfectiva(user: AuthUser) {
  if (esDireccion(user)) return 'direccion' as const;
  return user.funcion ?? 'abogado';
}

export function exigirFuncion(user: AuthUser, ambito: 'escribir' | 'plazos' | 'dinero') {
  const funcion = funcionEfectiva(user);
  if (funcion === 'direccion' || funcion === 'abogado') return;
  if (ambito === 'escribir' && funcion === 'pasante') return;
  if (ambito === 'plazos' && funcion === 'pasante') return;
  if (ambito === 'dinero' && funcion === 'caja') return;
  throw new ForbiddenException('Tu función en el despacho no puede hacer eso.');
}
