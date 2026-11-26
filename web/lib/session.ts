export type Permiso = {
  clave: string;
  insertar: boolean;
  actualizar: boolean;
  eliminar: boolean;
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'DUENO' | 'PERSONAL' | 'ADMIN_DESPACHO' | 'MIEMBRO_DESPACHO';
  despacho_id: number | null;
  despacho_slug: string | null;
  funcion?: 'abogado' | 'pasante' | 'caja' | 'consulta' | null;
  sede_id?: number | null;
  permisos?: Permiso[];
};

export function puede(clave: string, accion: 'ver' | 'insertar' | 'actualizar' | 'eliminar' = 'ver') {
  const user = readSession()?.user;
  if (!user) return false;
  if (user.role === 'DUENO') return true;
  const permiso = user.permisos?.find((item) => item.clave === clave);
  if (!permiso) return false;
  return accion === 'ver' ? true : permiso[accion];
}

export function esPersonalSoloLectura(clave: string, accion: 'insertar' | 'actualizar' | 'eliminar' = 'insertar') {
  const user = readSession()?.user;
  if (!user || user.role !== 'PERSONAL') return false;
  return !puede(clave, accion);
}

export function homeFor(user: SessionUser) {
  if (user.role === 'ADMIN_DESPACHO' || user.role === 'MIEMBRO_DESPACHO') return '/despacho';
  return '/panel';
}

export type Session = {
  access_token: string;
  user: SessionUser;
};

const KEY = 'lexia.session';

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.access_token || !parsed.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}
