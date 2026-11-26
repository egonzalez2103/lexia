'use client';

import { DespachoPicker } from '@/components/despacho-picker';
import { MovimientosDesk } from '@/components/movimientos-desk';
import { PanelShell } from '@/components/panel-shell';

export default function CajaDelDiaPage() {
  return (
    <PanelShell>
      <DespachoPicker>{(despachoId) => <MovimientosDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
