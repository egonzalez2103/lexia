'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Cliente = { id: number; nombre_completo: string };
type Cuenta = { id: number; banco: string; numero: string };
type Deposito = { id: number; cliente: string; monto: number; fecha: string; referencia: string | null; estado: string; motivo: string | null };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function DepositosPage() {
  const [rows, setRows] = useState<Deposito[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');
  const [form, setForm] = useState({ cliente_id: '', cuenta_bancaria_id: '', monto: '', fecha: '', referencia: '' });

  async function load() {
    const [depositos, cartera, bancos] = await Promise.all([
      api<Deposito[]>('/depositos', {}, true),
      api<{ data: Cliente[] }>('/clientes?pageSize=200', {}, true),
      api<{ data: Cuenta[] }>('/cuentas-bancarias', {}, true).catch(() => ({ data: [] as Cuenta[] })),
    ]);
    setRows(depositos);
    setClientes(cartera.data);
    setCuentas(bancos.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los depósitos.'));
  }, []);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/depositos', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: Number(form.cliente_id),
          cuenta_bancaria_id: form.cuenta_bancaria_id ? Number(form.cuenta_bancaria_id) : undefined,
          monto: form.monto,
          fecha: form.fecha,
          referencia: form.referencia || undefined,
        }),
      }, true);
      setForm({ cliente_id: '', cuenta_bancaria_id: '', monto: '', fecha: '', referencia: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar el depósito.');
    }
  }

  async function resolver(id: number, accion: 'autorizar' | 'rechazar') {
    setError('');
    try {
      await api(`/depositos/${id}/${accion}`, { method: 'POST', body: accion === 'rechazar' ? JSON.stringify({ motivo }) : undefined }, true);
      setMotivo('');
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos resolver el depósito.');
    }
  }

  return (
    <DespachoShell>
      <PageTitle title="Depósitos" text="Un depósito pendiente no baja la deuda ni entra a la caja física. Baja la deuda cuando se autoriza." />
      <Notice error={error} />
      <form onSubmit={crear} className="mb-6 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-3">
        <select required className={inputClass} value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })}>
          <option value="">Cliente</option>
          {clientes.map((row) => <option key={row.id} value={row.id}>{row.nombre_completo}</option>)}
        </select>
        <select className={inputClass} value={form.cuenta_bancaria_id} onChange={(event) => setForm({ ...form, cuenta_bancaria_id: event.target.value })}>
          <option value="">Cuenta</option>
          {cuentas.map((row) => <option key={row.id} value={row.id}>{row.banco} · {row.numero}</option>)}
        </select>
        <input required className={inputClass} placeholder="Monto" value={form.monto} onChange={(event) => setForm({ ...form, monto: event.target.value })} />
        <input required type="date" className={inputClass} value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} />
        <input className={inputClass} placeholder="Referencia" value={form.referencia} onChange={(event) => setForm({ ...form, referencia: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white">Reportar depósito</button>
      </form>
      <input className={`${inputClass} mb-4 max-w-md`} placeholder="Motivo si lo rechazas" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{row.cliente} · {pesos.format(row.monto)}</p>
              <p className="text-neutral-600">{row.estado} · {row.fecha}{row.referencia ? ` · ${row.referencia}` : ''}{row.motivo ? ` · ${row.motivo}` : ''}</p>
            </div>
            {row.estado === 'pendiente' ? (
              <span className="flex gap-2">
                <button type="button" className="h-8 bg-black px-3 text-white" onClick={() => resolver(row.id, 'autorizar')}>Autorizar</button>
                <button type="button" className="h-8 border border-neutral-300 px-3" onClick={() => resolver(row.id, 'rechazar')}>Rechazar</button>
              </span>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">No hay depósitos.</li> : null}
      </ul>
    </DespachoShell>
  );
}
