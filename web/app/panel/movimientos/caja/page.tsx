'use client';

import { DespachoPicker } from '@/components/despacho-picker';
import { MovimientosDesk } from '@/components/movimientos-desk';
import { PageTitle, PanelShell } from '@/components/panel-shell';

export default function CajaDelDiaPage() {
  return (
    <PanelShell>
      <PageTitle title="Caja del día" text="El inicio sale de la caja general. El corte entrega el efectivo a caja chica." />
      <DespachoPicker>{(despachoId) => <MovimientosDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
