'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { MovimientosDesk } from '@/components/movimientos-desk';
import { PageTitle } from '@/components/panel-shell';

export default function CajaDelDiaDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle title="Caja del día" text="Ingresos, egresos, transferencias y corte de tu caja." />
      <MovimientosDesk />
    </DespachoShell>
  );
}