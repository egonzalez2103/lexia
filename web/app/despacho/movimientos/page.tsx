'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { MovimientosDesk } from '@/components/movimientos-desk';
import { PageTitle } from '@/components/panel-shell';

export default function MovimientosDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle title="Movimientos" text="Tu caja del día: ingresos, egresos, transferencias y corte." />
      <MovimientosDesk />
    </DespachoShell>
  );
}
