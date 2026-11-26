'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Audiencia = { id: number; titulo: string; fecha: string; hora: string | null; lugar: string | null; expediente_id: number; expediente: string };

export default function AgendaPage() {
  const [rows, setRows] = useState<Audiencia[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Audiencia[]>('/agenda', {}, true)
      .then(setRows)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir la agenda.'));
  }, []);

  return (
    <DespachoShell>
      <PageTitle title="Agenda" text="Audiencias de los próximos siete días." />
      <Notice error={error} />
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3 text-sm">
            <Link href={`/despacho/expedientes/${row.expediente_id}`} className="font-medium hover:underline">{row.titulo}</Link>
            <p className="text-neutral-600">{row.fecha}{row.hora ? ` · ${row.hora}` : ''}{row.lugar ? ` · ${row.lugar}` : ''} · {row.expediente}</p>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">No hay audiencias en esta semana.</li> : null}
      </ul>
    </DespachoShell>
  );
}
