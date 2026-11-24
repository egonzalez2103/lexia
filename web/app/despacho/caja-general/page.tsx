'use client';

import { CajaGeneralDesk } from '@/components/caja-general-desk';
import { DespachoShell } from '@/components/despacho-shell';
import { PageTitle } from '@/components/panel-shell';

export default function CajaGeneralDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle title="Caja general" text="Fondo del despacho. El cuadre de caja chica suma aquí y la caja chica vuelve a cero." />
      <CajaGeneralDesk />
    </DespachoShell>
  );
}
