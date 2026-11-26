'use client';

import { ClientesDesk } from '@/components/clientes-desk';
import { DespachoShell } from '@/components/despacho-shell';

export default function ClientesDespachoPage() {
  return (
    <DespachoShell>
      <ClientesDesk />
    </DespachoShell>
  );
}
