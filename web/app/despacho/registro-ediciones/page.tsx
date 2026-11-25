'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { RegistroEdiciones } from '@/components/registro-ediciones';

export default function RegistroEdicionesDespachoPage() {
  return (
    <DespachoShell>
      <RegistroEdiciones alcance="despacho" />
    </DespachoShell>
  );
}
