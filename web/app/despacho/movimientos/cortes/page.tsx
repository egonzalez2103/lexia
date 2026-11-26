'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { MovimientosDesk } from '@/components/movimientos-desk';

export default function CortesDespachoPage() {
  return (
    <DespachoShell>
      <MovimientosDesk modo="corte" />
    </DespachoShell>
  );
}
