'use client';

import { ComisionesDesk } from '@/components/comisiones-desk';
import { DespachoShell } from '@/components/despacho-shell';
import { PageTitle } from '@/components/panel-shell';

export default function ComisionesDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle title="Comisiones" text="Comisiones de los abogados de este despacho." />
      <ComisionesDesk />
    </DespachoShell>
  );
}
