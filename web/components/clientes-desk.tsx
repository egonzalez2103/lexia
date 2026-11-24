'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Cliente = {
  id: number;
  tipo: 'fisica' | 'moral';
  nombre: string;
  paterno: string | null;
  materno: string | null;
  nombre_completo: string;
  rfc: string | null;
  domicilio: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  activo: boolean;
};
type Detalle = Cliente & { pagos: Array<{ id: number; concepto: string; monto: number; fecha: string }> };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const vacio = { tipo: 'fisica', nombre: '', paterno: '', materno: '', rfc: '', domicilio: '', telefono: '', correo: '', notas: '', activo: true };

export function ClientesDesk({ despachoId }: { despachoId?: number }) {
  const [rows, setRows] = useState<Cliente[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState('');
  const [lecturaAlta, setLecturaAlta] = useState(false);
  const [lecturaCambio, setLecturaCambio] = useState(false);
  const base = despachoId ? `despacho_id=${despachoId}` : '';

  async function load(texto = q) {
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', String(despachoId));
    if (texto.trim()) params.set('q', texto.trim());
    setRows(await api<Cliente[]>(`/clientes${params.toString() ? `?${params.toString()}` : ''}`, {}, true));
  }

  useEffect(() => {
    load('').catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los clientes.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despachoId]);

  useEffect(() => {
    setLecturaAlta(esPersonalSoloLectura('clientes'));
    setLecturaCambio(esPersonalSoloLectura('clientes', 'actualizar'));
  }, []);

  function texto(value: string) {
    const limpio = value.trim();
    return limpio ? limpio : null;
  }

  function cuerpo() {
    const moral = form.tipo === 'moral';
    return {
      despacho_id: despachoId,
      tipo: form.tipo,
      nombre: form.nombre,
      paterno: moral ? null : texto(form.paterno),
      materno: moral ? null : texto(form.materno),
      rfc: texto(form.rfc),
      domicilio: texto(form.domicilio),
      telefono: texto(form.telefono),
      correo: texto(form.correo),
      notas: texto(form.notas),
      activo: form.activo,
    };
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editId) await api(`/clientes/${editId}`, { method: 'PATCH', body: JSON.stringify(cuerpo()) }, true);
      else await api('/clientes', { method: 'POST', body: JSON.stringify(cuerpo()) }, true);
      setForm(vacio);
      setEditId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar al cliente.');
    }
  }

  async function abrir(id: number) {
    setError('');
    try {
      setDetalle(await api<Detalle>(`/clientes/${id}${base ? `?${base}` : ''}`, {}, true));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir al cliente.');
    }
  }

  return (
    <div>
      <Notice error={error} />
      {lecturaAlta && !editId ? null : lecturaCambio && editId ? null : (
      <form onSubmit={guardar} className="mb-6 grid gap-2 border border-neutral-200 p-4 md:grid-cols-2">
        <select
          className={inputClass}
          value={form.tipo}
          onChange={(event) => {
            const tipo = event.target.value;
            setForm({ ...form, tipo, ...(tipo === 'moral' ? { paterno: '', materno: '' } : {}) });
          }}
        >
          <option value="fisica">Persona física</option>
          <option value="moral">Persona moral</option>
        </select>
        <input required className={inputClass} placeholder={form.tipo === 'moral' ? 'Razón social' : 'Nombre'} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
        {form.tipo === 'fisica' ? (
          <>
            <input required className={inputClass} placeholder="Apellido paterno" value={form.paterno} onChange={(event) => setForm({ ...form, paterno: event.target.value })} />
            <input className={inputClass} placeholder="Apellido materno" value={form.materno} onChange={(event) => setForm({ ...form, materno: event.target.value })} />
          </>
        ) : null}
        <input className={inputClass} placeholder="RFC" value={form.rfc} onChange={(event) => setForm({ ...form, rfc: event.target.value })} />
        <input className={inputClass} placeholder="Teléfono" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
        <input className={inputClass} placeholder="Correo" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} />
        <input className={inputClass} placeholder="Domicilio" value={form.domicilio} onChange={(event) => setForm({ ...form, domicilio: event.target.value })} />
        <textarea className={`${inputClass} h-20 py-2 md:col-span-2`} placeholder="Notas" value={form.notas} onChange={(event) => setForm({ ...form, notas: event.target.value })} />
        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              className="peer size-4 appearance-none rounded-sm border border-neutral-300 bg-white checked:border-black checked:bg-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
              checked={form.activo}
              onChange={(event) => setForm({ ...form, activo: event.target.checked })}
            />
            <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100">
              <path d="M3.5 8.2 6.4 11.1 12.5 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Activo
        </label>
        <button className="h-9 bg-black text-sm font-medium text-white">{editId ? 'Guardar cambios' : 'Dar de alta'}</button>
      </form>
      )}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos buscar.'));
        }}
      >
        <input className={inputClass} placeholder="Buscar por nombre o RFC" value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="h-9 border border-neutral-300 px-4 text-sm">Buscar</button>
      </form>
      <div className="divide-y divide-neutral-200 border border-neutral-200">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <button type="button" className="text-left" onClick={() => abrir(row.id)}>
              <p className="font-medium">{row.nombre_completo}</p>
              <p className="text-sm text-neutral-600">
                {row.tipo === 'moral' ? 'Persona moral' : 'Persona física'}
                {row.telefono ? ` · ${row.telefono}` : ''}
                {row.activo ? '' : ' · inactivo'}
              </p>
            </button>
            {lecturaCambio ? null : (
            <button
              type="button"
              className="text-sm font-semibold"
              onClick={() => {
                setEditId(row.id);
                setForm({
                  tipo: row.tipo,
                  nombre: row.nombre,
                  paterno: row.paterno ?? '',
                  materno: row.materno ?? '',
                  rfc: row.rfc ?? '',
                  domicilio: row.domicilio ?? '',
                  telefono: row.telefono ?? '',
                  correo: row.correo ?? '',
                  notas: row.notas ?? '',
                  activo: row.activo,
                });
              }}
            >
              Editar
            </button>
            )}
          </div>
        ))}
        {rows.length === 0 ? <p className="px-4 py-4 text-sm text-neutral-500">Todavía no hay clientes.</p> : null}
      </div>
      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setDetalle(null)}>
          <article className="max-h-[80vh] w-full max-w-lg overflow-y-auto bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{detalle.nombre_completo}</h2>
                <p className="text-sm text-neutral-600">{[detalle.domicilio, detalle.correo, detalle.rfc].filter(Boolean).join(' · ')}</p>
              </div>
              <button type="button" className="text-sm font-semibold" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </header>
            <h3 className="mb-2 font-semibold">Pagos</h3>
            {detalle.pagos.length === 0 ? <p className="text-sm text-neutral-500">Todavía no hay ingresos ligados a este cliente.</p> : null}
            <ul className="divide-y divide-neutral-200 border border-neutral-200">
              {detalle.pagos.map((pago) => (
                <li key={pago.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>
                    {pago.fecha} · {pago.concepto}
                  </span>
                  <span>{pesos.format(pago.monto)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </div>
  );
}
