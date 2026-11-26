'use client';

import { CajaEmpresa } from '@/components/caja-empresa';
import { PanelShell } from '@/components/panel-shell';

export default function MovimientosPage() {
  return (
    <PanelShell>
      <CajaEmpresa vista="movimientos" />
    </PanelShell>
  );
}
