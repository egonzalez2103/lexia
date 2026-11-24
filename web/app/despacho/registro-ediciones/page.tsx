'use client';

import { DespachoShell } from '@/components/despacho-shell';
import { PageTitle } from '@/components/panel-shell';
import { RegistroEdiciones } from '@/components/registro-ediciones';

export default function RegistroEdicionesDespachoPage() {
  return (
    <DespachoShell>
      <PageTitle
        title="Registro de ediciones"
        text="Cambios de este despacho: expedientes, términos, promociones, escritos y usuarios."
      />
      <RegistroEdiciones alcance="despacho" />
    </DespachoShell>
  );
}
