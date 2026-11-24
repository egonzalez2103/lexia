'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Resumen = {
  es_admin: boolean;
  pendiente: number;
  pagada: number;
  usuarios: Array<{ id: number; name: string }>;
  comisiones: Array<{ id: number; usuario: string; concepto: string; monto: number; fecha: string; estado: string }>;
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function ComisionesDesk({ despachoId }: { despachoId?: number }) {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ usuario_id: '', concepto: '', monto: '' });
  const [lectura, setLectura] = useState(false);
  const params = despachoId ? `?despacho_id=${despachoId}` : '';

  async function load() {
    setData(await api<Resumen>(`/comisiones${params}`, {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar las comisiones.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despachoId]);

  useEffect(() => {
    setLectura(esPersonalSoloLectura('comisiones'));
  }, []);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/comisiones', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId, usuario_id: Number(form.usuario_id), concepto: form.concepto, monto: Number(form.monto) }) }, true);
      setForm({ usuario_id: '', concepto: '', monto: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar la comisión.');
    }
  }

  async function pagar(id: number) {
    setError('');
    try {
      await api(`/comisiones/${id}/pagar`, { method: 'POST', body: JSON.stringify({ despacho_id: despachoId }) }, true);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos marcar la comisión.');
    }
  }

  return (
    <div>
      <Notice error={error} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <article className="border border-neutral-200 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pendiente</p>
          <p className="mt-2 text-2xl font-semibold">{pesos.format(data?.pendiente ?? 0)}</p>
        </article>
        <article className="border border-neutral-200 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pagada</p>
          <p className="mt-2 text-2xl font-semibold">{pesos.format(data?.pagada ?? 0)}</p>
        </article>
      </div>
      {data?.es_admin && !lectura ? (
        <form onSubmit={crear} className="mb-6 grid gap-2 border border-neutral-200 p-4 md:grid-cols-4">
          <select required className={inputClass} value={form.usuario_id} onChange={(event) => setForm({ ...form, usuario_id: event.target.value })}>
            <option value="">Abogado</option>
            {data.usuarios.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
          <input required className={inputClass} placeholder="Concepto" value={form.concepto} onChange={(event) => setForm({ ...form, concepto: event.target.value })} />
          <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={form.monto} onChange={(event) => setForm({ ...form, monto: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Registrar</button>
        </form>
      ) : null}
      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Abogado</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Monto</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(data?.comisiones ?? []).map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{row.fecha}</td>
                <td className="px-3 py-2">{row.usuario}</td>
                <td className="px-3 py-2">{row.concepto}</td>
                <td className="px-3 py-2">{pesos.format(row.monto)}</td>
                <td className="px-3 py-2">
                  {row.estado === 'pendiente' && data?.es_admin && !lectura ? (
                    <button type="button" className="font-semibold underline" onClick={() => pagar(row.id)}>
                      Marcar pagada
                    </button>
                  ) : row.estado === 'pagada' ? (
                    'Pagada'
                  ) : (
                    'Pendiente'
                  )}
                </td>
              </tr>
            ))}
            {data && data.comisiones.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  Todavía no hay comisiones.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
