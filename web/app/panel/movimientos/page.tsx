'use client';

import { DespachoPicker } from '@/components/despacho-picker';
import { ListaMovimientos } from '@/components/lista-movimientos';
import { PanelShell } from '@/components/panel-shell';

export default function MovimientosPage() {
  return (
    <PanelShell>
      <DespachoPicker>{(despachoId) => <ListaMovimientos despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
