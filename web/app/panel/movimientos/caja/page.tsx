'use client';

import { CajaEmpresa } from '@/components/caja-empresa';
import { PanelShell } from '@/components/panel-shell';

export default function CajaDelDiaPage() {
  return (
    <PanelShell>
      <CajaEmpresa vista="cortes" />
    </PanelShell>
  );
}
