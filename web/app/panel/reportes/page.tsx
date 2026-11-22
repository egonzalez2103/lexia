'use client';

import { useEffect, useState } from 'react';
import { Notice, PageTitle, PanelShell } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

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

export default function ReportesPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Resumen>('/reportes/resumen', {}, true)
      .then(setData)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos armar el reporte.'));
  }, []);

  const lines = data
    ? [
        ['Despachos activos', String(data.despachos_activos)],
        ['Despachos suspendidos', String(data.despachos_suspendidos)],
        ['Expedientes en todos los despachos', String(data.expedientes)],
        ['Colaboradores activos', String(data.colaboradores_activos)],
        ['Saldo de caja chica', pesos.format(data.saldo_chica)],
        ['Saldo de caja general', pesos.format(data.saldo_general)],
        ['Colaboradores por pagar esta semana', String(data.nominas_borrador)],
        ['Colaboradores con sueldo cubierto', String(data.nominas_pagadas_semana)],
        ['Pagado de nómina esta semana', pesos.format(data.monto_nominas_semana)],
      ]
    : [];

  return (
    <PanelShell>
      <PageTitle title="Reportes" text="Corte de la plataforma: despachos, personal, cajas y nómina de la semana en curso, de lunes a domingo." />
      <Notice error={error} />
      <dl className="divide-y divide-neutral-200 border border-neutral-200">
        {lines.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <dt>{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </PanelShell>
  );
}
