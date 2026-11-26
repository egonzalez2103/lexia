'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Termino = { id: number; titulo: string; vence_el: string; expediente_id: number; expediente: string; cliente: string };
type Actuacion = { id: number; tipo: string; titulo: string; fecha: string; expediente_id: number; expediente: string };
type Quieto = {
  expediente_id: number;
  titulo: string;
  cliente: string;
  numero: string | null;
  dias: number;
  desde: string;
  origen: 'actuacion' | 'apertura';
};
type Tablero = { terminos: Termino[]; actuaciones: Actuacion[]; inactividad: Quieto[] };

function hoy() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function plazo(vence: string) {
  const dias = Math.round((Date.parse(`${vence}T00:00:00`) - Date.parse(`${hoy()}T00:00:00`)) / 86400000);
  if (dias < 0) return `Venció hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

export default function InicioDespachoPage() {
  const [data, setData] = useState<Tablero | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Tablero>('/tablero', {}, true)
      .then(setData)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el tablero.'));
  }, []);

  return (
    <DespachoShell>
      <PageTitle title="Inicio" text="Términos por vencer, últimas actuaciones y asuntos sin movimiento. El tiempo sin actuación informa; la caducidad se revisa aparte." />
      <Notice error={error} />
      <div className="grid gap-6">
        <section className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Términos por vencer</h2>
          <ul className="divide-y divide-neutral-100">
            {data?.terminos.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <Link href={`/despacho/expedientes/${row.expediente_id}`} className="font-medium hover:underline">
                  {row.titulo}
                </Link>
                <p className="text-neutral-600">
                  {plazo(row.vence_el)} · {row.vence_el} · {row.expediente}
                  {row.cliente ? ` · ${row.cliente}` : ''}
                </p>
              </li>
            ))}
            {data && data.terminos.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">No hay términos pendientes en los próximos 14 días.</li> : null}
          </ul>
        </section>

        <section className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Últimas actuaciones</h2>
          <ul className="divide-y divide-neutral-100">
            {data?.actuaciones.map((row) => (
              <li key={`${row.tipo}-${row.id}`} className="px-4 py-3 text-sm">
                <Link href={`/despacho/expedientes/${row.expediente_id}`} className="font-medium hover:underline">
                  {row.titulo}
                </Link>
                <p className="text-neutral-600">
                  {row.tipo} · {row.fecha} · {row.expediente}
                </p>
              </li>
            ))}
            {data && data.actuaciones.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">Todavía no hay promociones ni escritos.</li> : null}
          </ul>
        </section>

        <section className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Tiempo sin actuación</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="h-12 px-4 font-semibold">Expediente</th>
                <th className="h-12 px-4 font-semibold">Cliente</th>
                <th className="h-12 px-4 font-semibold">Días</th>
                <th className="h-12 px-4 font-semibold">Desde</th>
              </tr>
            </thead>
            <tbody>
              {data?.inactividad.map((row) => (
                <tr key={row.expediente_id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">
                    <Link href={`/despacho/expedientes/${row.expediente_id}`} className="font-medium hover:underline">
                      {row.numero ? `${row.numero} · ` : ''}
                      {row.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.cliente}</td>
                  <td className="px-4 py-3">{row.dias}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.origen === 'apertura' ? `Apertura ${row.desde}` : row.desde}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.inactividad.length === 0 ? <p className="px-4 py-4 text-sm text-neutral-500">Todavía no hay expedientes.</p> : null}
        </section>
      </div>
    </DespachoShell>
  );
}
