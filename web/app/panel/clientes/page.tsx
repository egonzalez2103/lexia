'use client';

import { ClientesDesk } from '@/components/clientes-desk';
import { PanelShell } from '@/components/panel-shell';

export default function ClientesPage() {
  return (
    <PanelShell>
      <ClientesDesk elegirDespacho />
    </PanelShell>
  );
}
