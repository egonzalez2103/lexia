'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Asunto = { id: number; titulo: string; cliente_id: number; cliente: string; monto_acordado: number | null; esquema: string | null };
type Saldo = { cliente_id: number; cliente: string; cargos: number; abonos: number; saldo: number };
type Semana = { id: number; concepto: string; vence_el: string | null; saldo: number; cliente: string; asunto: string };
type Cartera = { semana: Semana[]; saldos: Saldo[]; asuntos: Asunto[] };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function HonorariosPage() {
  const [data, setData] = useState<Cartera | null>(null);
  const [error, setError] = useState('');
  const [convenio, setConvenio] = useState({ asunto_id: '', esquema: '', monto: '' });
  const [cargo, setCargo] = useState({ asunto_id: '', concepto: '', monto: '', vence_el: '' });
  const [abono, setAbono] = useState({ cliente_id: '', asunto_id: '', concepto: 'Abono', monto: '', medio: 'efectivo', fecha: '' });

  async function load() {
    setData(await api<Cartera>('/cartera', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir la cartera.'));
  }, []);

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar.');
    }
  }

  const asunto = data?.asuntos.find((row) => String(row.id) === convenio.asunto_id);

  async function guardarConvenio(event: FormEvent) {
    event.preventDefault();
    if (!asunto) return;
    await run(async () => {
      await api(`/asuntos/${asunto.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ cliente_id: asunto.cliente_id, titulo: asunto.titulo, esquema: convenio.esquema, monto_acordado: convenio.monto || undefined }),
      }, true);
    });
  }

  async function crearCargo(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/cargos', { method: 'POST', body: JSON.stringify({ asunto_id: Number(cargo.asunto_id), concepto: cargo.concepto, monto: cargo.monto, vence_el: cargo.vence_el || undefined }) }, true);
      setCargo({ asunto_id: '', concepto: '', monto: '', vence_el: '' });
    });
  }

  async function crearAbono(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const saved = await api<{ id: number }>('/abonos', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: Number(abono.cliente_id),
          asunto_id: abono.asunto_id ? Number(abono.asunto_id) : undefined,
          concepto: abono.concepto,
          monto: abono.monto,
          medio: abono.medio,
          fecha: abono.fecha,
        }),
      }, true);
      window.location.href = `/despacho/honorarios/recibos/${saved.id}`;
    });
  }

  return (
    <DespachoShell>
      <PageTitle title="Honorarios" text="El convenio genera cargos. Un abono en efectivo entra a la caja de quien lo registra y baja la deuda. Un depósito bancario no baja la deuda hasta autorizarse." />
      <Notice error={error} />
      <section className="mb-8 rounded-lg border border-neutral-200">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Cobranza de la semana</h2>
        <ul className="divide-y divide-neutral-100">
          {data?.semana.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{row.concepto} · {pesos.format(row.saldo)}</p>
              <p className="text-neutral-600">{row.cliente} · {row.asunto}{row.vence_el ? ` · vence ${row.vence_el}` : ''}</p>
            </li>
          ))}
          {data && data.semana.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">No hay cargos por vencer.</li> : null}
        </ul>
      </section>
      <form onSubmit={guardarConvenio} className="mb-6 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-3">
        <select required className={inputClass} value={convenio.asunto_id} onChange={(event) => {
          const elegido = data?.asuntos.find((row) => String(row.id) === event.target.value);
          setConvenio({ asunto_id: event.target.value, esquema: elegido?.esquema ?? '', monto: elegido?.monto_acordado ? String(elegido.monto_acordado) : '' });
        }}>
          <option value="">Asunto</option>
          {data?.asuntos.map((row) => <option key={row.id} value={row.id}>{row.cliente} · {row.titulo}</option>)}
        </select>
        <input className={inputClass} placeholder="Esquema, por ejemplo iguala o tres exhibiciones" value={convenio.esquema} onChange={(event) => setConvenio({ ...convenio, esquema: event.target.value })} />
        <input className={inputClass} placeholder="Monto acordado" value={convenio.monto} onChange={(event) => setConvenio({ ...convenio, monto: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-3">Guardar convenio</button>
      </form>
      <form onSubmit={crearCargo} className="mb-6 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-4">
        <select required className={inputClass} value={cargo.asunto_id} onChange={(event) => setCargo({ ...cargo, asunto_id: event.target.value })}>
          <option value="">Asunto</option>
          {data?.asuntos.map((row) => <option key={row.id} value={row.id}>{row.titulo}</option>)}
        </select>
        <input required className={inputClass} placeholder="Concepto del cargo" value={cargo.concepto} onChange={(event) => setCargo({ ...cargo, concepto: event.target.value })} />
        <input required className={inputClass} placeholder="Monto" value={cargo.monto} onChange={(event) => setCargo({ ...cargo, monto: event.target.value })} />
        <input type="date" className={inputClass} value={cargo.vence_el} onChange={(event) => setCargo({ ...cargo, vence_el: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-4">Generar cargo</button>
      </form>
      <form onSubmit={crearAbono} className="mb-8 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-3">
        <select required className={inputClass} value={abono.cliente_id} onChange={(event) => setAbono({ ...abono, cliente_id: event.target.value })}>
          <option value="">Cliente</option>
          {data?.saldos.map((row) => <option key={row.cliente_id} value={row.cliente_id}>{row.cliente}</option>)}
          {data?.asuntos.filter((row, index, lista) => lista.findIndex((item) => item.cliente_id === row.cliente_id) === index && !data.saldos.some((saldo) => saldo.cliente_id === row.cliente_id)).map((row) => (
            <option key={row.cliente_id} value={row.cliente_id}>{row.cliente}</option>
          ))}
        </select>
        <input required className={inputClass} placeholder="Concepto" value={abono.concepto} onChange={(event) => setAbono({ ...abono, concepto: event.target.value })} />
        <input required className={inputClass} placeholder="Monto" value={abono.monto} onChange={(event) => setAbono({ ...abono, monto: event.target.value })} />
        <select className={inputClass} value={abono.medio} onChange={(event) => setAbono({ ...abono, medio: event.target.value })}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="otro">Otro</option>
        </select>
        <input required type="date" className={inputClass} value={abono.fecha} onChange={(event) => setAbono({ ...abono, fecha: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white">Registrar abono e imprimir recibo</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-white">
          <tr>
            <th className="h-12 px-4 font-semibold">Cliente</th>
            <th className="h-12 px-4 font-semibold">Cargos</th>
            <th className="h-12 px-4 font-semibold">Abonos</th>
            <th className="h-12 px-4 font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {data?.saldos.map((row) => (
            <tr key={row.cliente_id} className="border-b border-neutral-100">
              <td className="px-4 py-3">{row.cliente}</td>
              <td className="px-4 py-3">{pesos.format(row.cargos)}</td>
              <td className="px-4 py-3">{pesos.format(row.abonos)}</td>
              <td className="px-4 py-3">{pesos.format(row.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm"><Link className="underline" href="/despacho/depositos">Depósitos por autorizar</Link></p>
    </DespachoShell>
  );
}
