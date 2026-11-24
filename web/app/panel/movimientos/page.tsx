'use client';

import { DespachoPicker } from '@/components/despacho-picker';
import { MovimientosDesk } from '@/components/movimientos-desk';
import { PageTitle, PanelShell } from '@/components/panel-shell';

export default function MovimientosPage() {
  return (
    <PanelShell>
      <PageTitle
        title="Movimientos"
        text="Caja del día de un despacho. El inicio sale de la caja general. El corte entrega el efectivo a caja chica."
      />
      <DespachoPicker>{(despachoId) => <MovimientosDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
