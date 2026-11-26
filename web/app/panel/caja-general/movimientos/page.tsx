'use client';

import { CajaEmpresa } from '@/components/caja-empresa';
import { PanelShell } from '@/components/panel-shell';

export default function MovimientosCajaGeneralEmpresaPage() {
  return (
    <PanelShell>
      <CajaEmpresa vista="movimientos-general" />
    </PanelShell>
  );
}
