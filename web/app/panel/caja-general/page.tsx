'use client';

import { CajaGeneralDesk } from '@/components/caja-general-desk';
import { DespachoPicker } from '@/components/despacho-picker';
import { PageTitle, PanelShell } from '@/components/panel-shell';

export default function CajaGeneralPage() {
  return (
    <PanelShell>
      <PageTitle
        title="Caja general"
        text="Se alimenta con un ingreso inicial y con cada cuadre de caja chica. Los inicios que se entregan a un usuario se restan aquí."
      />
      <DespachoPicker>{(despachoId) => <CajaGeneralDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
