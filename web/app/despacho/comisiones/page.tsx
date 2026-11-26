'use client';

import { ComisionesDesk } from '@/components/comisiones-desk';
import { DespachoShell } from '@/components/despacho-shell';

export default function ComisionesDespachoPage() {
  return (
    <DespachoShell>
      <ComisionesDesk />
    </DespachoShell>
  );
}
