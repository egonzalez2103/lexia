'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { ListaMovimientos } from '@/components/lista-movimientos';

export default function MovimientosDespachoPage() {
  return (
    <DespachoShell>
      <ListaMovimientos />
    </DespachoShell>
  );
}
