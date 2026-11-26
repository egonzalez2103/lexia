'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Notice, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Movimiento = { id: number; caja: string; tipo: string; concepto: string; monto: number; fecha: string };
type Corte = { id: number; caja: string; fecha: string; saldo_contado: number; notas: string | null };
type Resumen = { saldos: { chica: number; general: number }; movimientos: Movimiento[]; cortes: Corte[] };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function CajaPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [mov, setMov] = useState({ caja: 'general', tipo: 'ingreso', concepto: '', monto: '', fecha: '' });
  const [corte, setCorte] = useState({ caja: 'general', fecha: '', saldo_contado: '', notas: '' });

  async function load() {
    setData(await api<Resumen>('/caja', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la caja.'));
  }, []);

  async function mover(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja/movimientos', { method: 'POST', body: JSON.stringify({ ...mov, monto: Number(mov.monto) }) }, true);
      setMov({ ...mov, concepto: '', monto: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar el movimiento.');
    }
  }

  async function cortar(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja/cortes', { method: 'POST', body: JSON.stringify({ ...corte, saldo_contado: Number(corte.saldo_contado) }) }, true);
      setCorte({ ...corte, saldo_contado: '', notas: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el corte.');
    }
  }

  return (
    <PanelShell>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Caja chica</h1>
        <p className="mt-2 text-neutral-500">Cuadre de la caja chica de la plataforma. El saldo sale de los ingresos menos los egresos.</p>
      </header>
      <Notice error={error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-neutral-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Caja chica</p>
          <p className="mt-2 text-2xl font-bold">{pesos.format(data?.saldos.chica ?? 0)}</p>
        </article>
        <article className="rounded-lg border border-neutral-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Caja general</p>
          <p className="mt-2 text-2xl font-bold">{pesos.format(data?.saldos.general ?? 0)}</p>
        </article>
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <form onSubmit={mover} className="grid gap-3 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Movimiento</h2>
          <select className={inputClass} value={mov.caja} onChange={(event) => setMov({ ...mov, caja: event.target.value })}>
            <option value="general">Caja general</option>
            <option value="chica">Caja chica</option>
          </select>
          <select className={inputClass} value={mov.tipo} onChange={(event) => setMov({ ...mov, tipo: event.target.value })}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
          <input required className={inputClass} placeholder="Concepto" value={mov.concepto} onChange={(event) => setMov({ ...mov, concepto: event.target.value })} />
          <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={mov.monto} onChange={(event) => setMov({ ...mov, monto: event.target.value })} />
          <input required type="date" className={inputClass} value={mov.fecha} onChange={(event) => setMov({ ...mov, fecha: event.target.value })} />
          <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Registrar</button>
        </form>
        <form onSubmit={cortar} className="grid gap-3 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Corte</h2>
          <select className={inputClass} value={corte.caja} onChange={(event) => setCorte({ ...corte, caja: event.target.value })}>
            <option value="general">Caja general</option>
            <option value="chica">Caja chica</option>
          </select>
          <input required type="date" className={inputClass} value={corte.fecha} onChange={(event) => setCorte({ ...corte, fecha: event.target.value })} />
          <input required type="number" min="0" step="0.01" className={inputClass} placeholder="Saldo contado" value={corte.saldo_contado} onChange={(event) => setCorte({ ...corte, saldo_contado: event.target.value })} />
          <textarea className={`${inputClass} h-20 py-2`} placeholder="Notas" value={corte.notas} onChange={(event) => setCorte({ ...corte, notas: event.target.value })} />
          <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Guardar corte</button>
        </form>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Movimientos</h2>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Caja</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {data?.movimientos.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{String(row.fecha).slice(0, 10)}</td>
                <td className="px-3 py-2">{row.caja === 'chica' ? 'Chica' : 'General'}</td>
                <td className="px-3 py-2">{row.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
                <td className="px-3 py-2">{row.concepto}</td>
                <td className="px-3 py-2">{pesos.format(row.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}
