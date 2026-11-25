'use client';

import { CatalogoMovimientos } from '@/components/catalogo-movimientos';
import { DespachoPicker } from '@/components/despacho-picker';
import { PanelShell } from '@/components/panel-shell';

export default function CatalogoMovimientosPage() {
  return (
    <PanelShell>
      <DespachoPicker>{(despachoId) => <CatalogoMovimientos despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
