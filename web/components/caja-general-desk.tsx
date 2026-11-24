'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Movimiento = { id: number; tipo: string; concepto: string; monto: number; fecha: string };
type Resumen = {
  saldo_general: number;
  saldo_chica: number;
  pendientes_corte: Array<{ id: number; name: string; saldo: number }>;
  cortes: Array<{ id: number; usuario: string; fecha: string; total: number }>;
  movimientos: Movimiento[];
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const TIPOS: Record<string, string> = { ingreso: 'Ingreso', egreso: 'Egreso', inicio: 'Inicio entregado', cuadre: 'Cuadre de caja chica' };

export function CajaGeneralDesk({ despachoId }: { despachoId?: number }) {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ tipo: 'ingreso', concepto: '', monto: '' });
  const [lectura, setLectura] = useState(false);
  const params = despachoId ? `?despacho_id=${despachoId}` : '';

  async function load() {
    setData(await api<Resumen>(`/caja-general${params}`, {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la caja general.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despachoId]);

  useEffect(() => {
    setLectura(esPersonalSoloLectura('caja-general'));
  }, []);

  async function mover(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja-general/movimientos', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId, tipo: form.tipo, concepto: form.concepto, monto: Number(form.monto) }) }, true);
      setForm({ ...form, concepto: '', monto: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar el movimiento.');
    }
  }

  async function cuadrar() {
    setError('');
    try {
      await api('/caja-general/cuadres', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId }) }, true);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos cuadrar la caja chica.');
    }
  }

  if (!data) {
    return (
      <div>
        <Notice error={error} />
        {error ? null : <p className="text-sm text-neutral-500">Cargando la caja general…</p>}
      </div>
    );
  }

  return (
    <div>
      <Notice error={error} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <article className="border border-neutral-200 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Caja general</p>
          <p className="mt-2 text-2xl font-semibold">{pesos.format(data?.saldo_general ?? 0)}</p>
        </article>
        <article className="border border-neutral-200 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Caja chica por cuadrar</p>
          <p className="mt-2 text-2xl font-semibold">{pesos.format(data?.saldo_chica ?? 0)}</p>
        </article>
      </div>
      {data?.pendientes_corte.length ? (
        <p className="mb-4 border border-neutral-200 px-4 py-3 text-sm">
          Falta el corte de {data.pendientes_corte.map((persona) => persona.name).join(', ')}. La caja chica no se puede cuadrar mientras eso siga abierto.
        </p>
      ) : null}
      <section className="mb-6 border border-neutral-200">
        <h2 className="border-b border-neutral-200 px-4 py-2 font-semibold">Cortes por pasar a caja general</h2>
        {data.cortes.length === 0 ? <p className="px-4 py-3 text-sm text-neutral-500">No hay cortes esperando cuadre.</p> : null}
        {data.cortes.map((corte) => (
          <div key={corte.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-0">
            <span>
              {corte.fecha} · {corte.usuario}
            </span>
            <span className="font-medium">{pesos.format(corte.total)}</span>
          </div>
        ))}
      </section>
      {lectura ? null : (
        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" className="h-9 bg-black px-4 text-sm font-medium text-white" onClick={cuadrar}>
            Cuadrar caja chica
          </button>
        </div>
      )}
      {lectura ? null : <form onSubmit={mover} className="mb-6 grid gap-2 border border-neutral-200 p-4 md:grid-cols-4">
        <select className={inputClass} value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <input required className={inputClass} placeholder="Concepto" value={form.concepto} onChange={(event) => setForm({ ...form, concepto: event.target.value })} />
        <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={form.monto} onChange={(event) => setForm({ ...form, monto: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white">Registrar</button>
      </form>}
      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {(data?.movimientos ?? []).map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{row.fecha}</td>
                <td className="px-3 py-2">{TIPOS[row.tipo] ?? row.tipo}</td>
                <td className="px-3 py-2">{row.concepto}</td>
                <td className="px-3 py-2">{pesos.format(row.monto)}</td>
              </tr>
            ))}
            {data && data.movimientos.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  La caja general empieza con un ingreso, por ejemplo el fondo del despacho.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
