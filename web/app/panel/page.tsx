'use client';

import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, PageTitle, PanelShell } from '@/components/panel-shell';

type Resumen = {
  despachos_activos: number;
  despachos_suspendidos: number;
  colaboradores_activos: number;
  saldo_chica: number;
  saldo_general: number;
  nominas_borrador: number;
  nominas_pagadas_semana: number;
  monto_nominas_semana: number;
  expedientes: number;
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function PanelPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Resumen>('/reportes/resumen', {}, true)
      .then(setData)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar el resumen.'));
  }, []);

  const cards = data
    ? [
        ['Despachos activos', String(data.despachos_activos)],
        ['Despachos suspendidos', String(data.despachos_suspendidos)],
        ['Expedientes', String(data.expedientes)],
        ['Colaboradores', String(data.colaboradores_activos)],
        ['Caja chica', pesos.format(data.saldo_chica)],
        ['Caja general', pesos.format(data.saldo_general)],
        ['Por pagar esta semana', String(data.nominas_borrador)],
        ['Nómina de la semana', pesos.format(data.monto_nominas_semana)],
      ]
    : [];

  return (
    <PanelShell>
      <PageTitle title="Panel del dueño" text="Desde aquí se abren los despachos y se lleva la administración de la plataforma." />
      <Notice error={error} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="border border-neutral-200 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
            <p className="mt-2 font-serif text-2xl">{value}</p>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}
