'use client';

import { CajaEmpresa } from '@/components/caja-empresa';
import { PanelShell } from '@/components/panel-shell';

export default function CajaPage() {
  return (
    <PanelShell>
      <CajaEmpresa vista="chica" />
    </PanelShell>
  );
}
