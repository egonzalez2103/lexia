'use client';

import { MovimientosCajaGeneral } from '@/components/caja-general-desk';
import { PanelShell } from '@/components/panel-shell';

export default function CajaGeneralPage() {
  return (
    <PanelShell>
      <MovimientosCajaGeneral elegirDespacho />
    </PanelShell>
  );
}
