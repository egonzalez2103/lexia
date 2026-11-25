import { CampoEdicion } from '../entities/bitacora-edicion.entity';

export const ENTIDADES: Record<string, string> = {
  Despacho: 'Despacho',
  Usuario: 'Usuario del despacho',
  Colaborador: 'Colaborador',
  Expediente: 'Expediente',
  Termino: 'Término',
  Promocion: 'Promoción',
  Escrito: 'Escrito',
  MovimientoCaja: 'Movimiento de caja',
  CorteCaja: 'Corte de caja',
  NominaPago: 'Pago de nómina',
  NominaComprobante: 'Comprobante de nómina',
  NominaRecibo: 'Recibo de nómina',
  MovimientoDespacho: 'Movimiento',
  RegistroMovimiento: 'Registro de movimiento',
  TipoMovimiento: 'Tipo de movimiento',
  CuentaBancaria: 'Cuenta bancaria',
  CorteDespacho: 'Corte de caja',
  CajaGeneral: 'Caja general',
  CuadreCaja: 'Cuadre de caja chica',
  Cliente: 'Cliente',
  Comision: 'Comisión',
};

export const TIPOS_CAMBIO: Record<string, string> = {
  alta: 'Alta',
  edicion: 'Edición',
  baja: 'Baja',
};

export function plano(valor: unknown): string {
  if (valor == null) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

export function altaDe(ficha: Record<string, unknown>): Record<string, CampoEdicion> {
  const campos: Record<string, CampoEdicion> = {};
  for (const [clave, valor] of Object.entries(ficha)) {
    if (plano(valor) === '') continue;
    campos[clave] = { anterior: null, nuevo: valor };
  }
  return campos;
}

export function bajaDe(ficha: Record<string, unknown>): Record<string, CampoEdicion> {
  const campos: Record<string, CampoEdicion> = {};
  for (const [clave, valor] of Object.entries(ficha)) {
    if (plano(valor) === '') continue;
    campos[clave] = { anterior: valor, nuevo: null };
  }
  return campos;
}

export function diffCampos(
  antes: Record<string, unknown>,
  despues: Record<string, unknown>,
): Record<string, CampoEdicion> | null {
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  const campos: Record<string, CampoEdicion> = {};
  for (const clave of claves) {
    const anterior = antes[clave] ?? null;
    const nuevo = despues[clave] ?? null;
    if (plano(anterior) === plano(nuevo)) continue;
    campos[clave] = { anterior, nuevo };
  }
  return Object.keys(campos).length ? campos : null;
}

export function resumirCampos(campos: Record<string, CampoEdicion> | null | undefined): string {
  if (!campos || typeof campos !== 'object') return '—';
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(campos)) {
    if (!valor || typeof valor !== 'object') continue;
    const anterior = texto(valor.anterior);
    const nuevo = texto(valor.nuevo);
    if (anterior === '—' && nuevo === '—') continue;
    if (anterior === '—') partes.push(`${clave}: ${nuevo}`);
    else if (nuevo === '—') partes.push(`${clave}: ${anterior} (se quitó)`);
    else partes.push(`${clave}: ${anterior} → ${nuevo}`);
  }
  return partes.length ? partes.slice(0, 4).join(' · ') : '—';
}

function texto(valor: unknown) {
  const planoValor = plano(valor);
  if (!planoValor) return '—';
  return planoValor.length > 80 ? `${planoValor.slice(0, 77)}…` : planoValor;
}
