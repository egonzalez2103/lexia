import { centavos } from '../common/alcance.service';
import { money } from '../common/slug';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';

export type SaldoUsuario = {
  responsable: number;
  disponible: number;
  reservado: number;
  inicio: number;
  ingresos: number;
  egresos: number;
};

export function hastaPorUsuario(cortes: Array<{ usuario_id: number; hasta_movimiento_id: number }>) {
  const map = new Map<number, number>();
  for (const corte of cortes) {
    map.set(corte.usuario_id, Math.max(map.get(corte.usuario_id) ?? 0, corte.hasta_movimiento_id));
  }
  return map;
}

export function involucra(mov: { usuario_id: number; contraparte_usuario_id: number | null }, userId: number) {
  return mov.usuario_id === userId || mov.contraparte_usuario_id === userId;
}

export function tieneCajaAbierta(
  movs: Array<{ id: number; estado: string; usuario_id: number; contraparte_usuario_id: number | null }>,
  userId: number,
  hastaId: number,
) {
  return movs.some((mov) => mov.id > hastaId && mov.estado !== 'rechazado' && involucra(mov, userId));
}

export function saldoUsuario(movs: MovimientoDespacho[], userId: number, hastaId: number): SaldoUsuario {
  let responsable = 0;
  let reservado = 0;
  let inicio = 0;
  let ingresos = 0;
  let egresos = 0;
  for (const mov of movs) {
    if (mov.id <= hastaId) continue;
    const monto = money(mov.monto);
    if (mov.tipo === 'transferencia' && mov.estado === 'pendiente' && mov.usuario_id === userId) {
      reservado += monto;
      continue;
    }
    if (mov.estado !== 'aplicado') continue;
    if (mov.usuario_id === userId) {
      if (mov.tipo === 'inicio') {
        responsable += monto;
        inicio += monto;
      } else if (mov.tipo === 'ingreso') {
        responsable += monto;
        ingresos += monto;
      } else if (mov.tipo === 'egreso' || mov.tipo === 'transferencia') {
        responsable -= monto;
        egresos += monto;
      }
    } else if (mov.tipo === 'transferencia' && mov.contraparte_usuario_id === userId) {
      responsable += monto;
      ingresos += monto;
    }
  }
  responsable = centavos(responsable);
  reservado = centavos(reservado);
  return {
    responsable,
    reservado,
    disponible: centavos(responsable - reservado),
    inicio: centavos(inicio),
    ingresos: centavos(ingresos),
    egresos: centavos(egresos),
  };
}

export function saldoCaja(rows: Array<{ tipo: string; monto: string }>) {
  return centavos(
    rows.reduce((total, row) => {
      const monto = money(row.monto);
      return row.tipo === 'ingreso' || row.tipo === 'cuadre' ? total + monto : total - monto;
    }, 0),
  );
}
