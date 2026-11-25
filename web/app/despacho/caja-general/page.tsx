'use client';

import { MovimientosCajaGeneral } from '@/components/caja-general-desk';
import { DespachoShell } from '@/components/despacho-shell';

export default function CajaGeneralDespachoPage() {
  return (
    <DespachoShell>
      <MovimientosCajaGeneral />
    </DespachoShell>
  );
}
