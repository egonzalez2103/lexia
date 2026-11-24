'use client';

import { PageTitle, PanelShell } from '@/components/panel-shell';
import { RegistroEdiciones } from '@/components/registro-ediciones';

export default function RegistroEdicionesPage() {
  return (
    <PanelShell>
      <PageTitle
        title="Registro de ediciones"
        text="Consulta quién dio de alta, cambió o dio de baja un registro. El alta de un despacho queda en la plataforma; lo demás queda en su despacho."
      />
      <RegistroEdiciones alcance="plataforma" />
    </PanelShell>
  );
}
