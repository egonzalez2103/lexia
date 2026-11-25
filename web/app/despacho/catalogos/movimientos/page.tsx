'use client';

import { CatalogoMovimientos } from '@/components/catalogo-movimientos';
import { DespachoShell } from '@/components/despacho-shell';

export default function CatalogoDespachoPage() {
  return (
    <DespachoShell>
      <CatalogoMovimientos />
    </DespachoShell>
  );
}
