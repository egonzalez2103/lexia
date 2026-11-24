'use client';

import { ClientesDesk } from '@/components/clientes-desk';
import { DespachoPicker } from '@/components/despacho-picker';
import { PageTitle, PanelShell } from '@/components/panel-shell';

export default function ClientesPage() {
  return (
    <PanelShell>
      <PageTitle title="Clientes" text="Cada despacho tiene su propia cartera. Un cliente puede tener varios asuntos y expedientes." />
      <DespachoPicker>{(despachoId) => <ClientesDesk despachoId={despachoId} />}</DespachoPicker>
    </PanelShell>
  );
}
