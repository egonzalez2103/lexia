'use client';

import { useEffect, useState } from 'react';
import { AparienciaForm } from '@/components/apariencia-form';
import { type FichaDespacho } from '@/components/ficha-publica';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';
import { readSession } from '@/lib/session';

export default function AparienciaPage() {
  const [despacho, setDespacho] = useState<FichaDespacho | null>(null);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const esAdmin = readSession()?.user.role === 'ADMIN_DESPACHO';
    setAdmin(esAdmin);
    if (!esAdmin) return;
    api<FichaDespacho>('/despachos/mio', {}, true)
      .then(setDespacho)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir la apariencia.'));
  }, []);

  return (
    <DespachoShell>
      <PageTitle title="Apariencia" text="El logo, la portada y los colores se ven en la ficha pública, como la página del despacho." />
      <Notice error={error} />
      {admin && despacho ? (
        <AparienciaForm
          despacho={despacho}
          onSave={async (body) => {
            const guardado = await api<FichaDespacho>('/despachos/mio', { method: 'PATCH', body: JSON.stringify(body) }, true);
            setDespacho(guardado);
          }}
        />
      ) : null}
      {admin === false ? <p className="text-sm text-neutral-600">La apariencia la define la administración del despacho.</p> : null}
    </DespachoShell>
  );
}
