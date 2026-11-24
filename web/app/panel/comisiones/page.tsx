'use client';

import { ComisionesDesk } from '@/components/comisiones-desk';
import { DespachoPicker } from '@/components/despacho-picker';
import { PageTitle, PanelShell } from '@/components/panel-shell';

export default function ComisionesPage() {
  return (
    <PanelShell>
      <PageTitle title="Comisiones" text="Comisiones de los abogados del despacho. Quedan pendientes hasta que la administración las marca como pagadas." />
      <DespachoPicker>{(despachoId) => <ComisionesDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
