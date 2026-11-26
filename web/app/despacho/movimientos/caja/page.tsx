'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { MovimientosDesk } from '@/components/movimientos-desk';

export default function CajaDelDiaDespachoPage() {
  return (
    <DespachoShell>
      <MovimientosDesk />
    </DespachoShell>
  );
}