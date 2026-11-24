'use client';

import { ClientesDesk } from '@/components/clientes-desk';
import { DespachoShell } from '@/components/despacho-shell';
import { PageTitle } from '@/components/panel-shell';

export default function ClientesDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle title="Clientes" text="Personas y empresas de este despacho. Los ingresos de caja pueden ligarse a un cliente." />
      <ClientesDesk />
    </DespachoShell>
  );
}
