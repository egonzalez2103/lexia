'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { MovimientosDesk } from '@/components/movimientos-desk';

export default function IniciosCajaDespachoPage() {
  return (
    <DespachoShell>
      <MovimientosDesk modo="inicio" />
    </DespachoShell>
  );
}
