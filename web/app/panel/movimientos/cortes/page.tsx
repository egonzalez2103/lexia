'use client';

import { CajaEmpresa } from '@/components/caja-empresa';
import { PanelShell } from '@/components/panel-shell';

export default function CortesDelDiaPage() {
  return (
    <PanelShell>
      <CajaEmpresa vista="cortes" />
    </PanelShell>
  );
}
