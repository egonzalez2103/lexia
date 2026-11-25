'use client';

import { PanelShell } from '@/components/panel-shell';
import { RegistroEdiciones } from '@/components/registro-ediciones';

export default function RegistroEdicionesPage() {
  return (
    <PanelShell>
      <RegistroEdiciones alcance="plataforma" />
    </PanelShell>
  );
}
