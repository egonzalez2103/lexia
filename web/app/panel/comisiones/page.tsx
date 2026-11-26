'use client';

import { ComisionesDesk } from '@/components/comisiones-desk';
import { PanelShell } from '@/components/panel-shell';

export default function ComisionesPage() {
  return (
    <PanelShell>
      <ComisionesDesk elegirDespacho />
    </PanelShell>
  );
}
