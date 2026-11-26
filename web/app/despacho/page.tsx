'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Cliente = { id: number; nombre_completo: string };
type Asunto = { id: number; cliente_id: number; titulo: string };
type Catalogo = { id: number; tipo: string; nombre: string };
type Autoridad = { id: number; nombre: string };
type Expediente = {
  id: number;
  folio: string | null;
  titulo: string;
  cliente: string;
  numero: string | null;
  anio: number | null;
  materia_nombre: string | null;
  autoridad: string | null;
  estatus: string | null;
};

const vacio = {
  titulo: '',
  cliente_id: '',
  asunto_id: '',
  asunto_nuevo: '',
  numero: '',
  anio: '',
  materia_id: '',
  autoridad_id: '',
  jurisdiccion_id: '',
  instancia_id: '',
  estatus_id: '',
  sede_id: '',
  etapa: '',
};

function numero(row: Expediente) {
  if (row.numero && row.anio) return `${row.numero}/${row.anio}`;
  return row.folio ?? '';
}

export default function DespachoPage() {
  const [rows, setRows] = useState<Expediente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asuntos, setAsuntos] = useState<Asunto[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [autoridades, setAutoridades] = useState<Autoridad[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(vacio);

  async function load() {
    const [expedientes, cartera, listaAsuntos, listaCatalogos, listaAutoridades] = await Promise.all([
      api<Expediente[]>('/expedientes', {}, true),
      api<{ data: Cliente[] }>('/clientes?pageSize=200', {}, true),
      api<Asunto[]>('/asuntos', {}, true),
      api<Catalogo[]>('/catalogos-juridicos', {}, true),
      api<Autoridad[]>('/autoridades', {}, true),
    ]);
    setRows(expedientes);
    setClientes(cartera.data);
    setAsuntos(listaAsuntos);
    setCatalogos(listaCatalogos);
    setAutoridades(listaAutoridades);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los expedientes.'));
  }, []);

  function opciones(tipo: string) {
    return catalogos.filter((row) => row.tipo === tipo);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      let asuntoId = form.asunto_id ? Number(form.asunto_id) : undefined;
      if (!asuntoId && !form.asunto_nuevo.trim()) {
        setError('Escribe el asunto o elige uno del cliente.');
        return;
      }
      if (!asuntoId && form.asunto_nuevo.trim()) {
        const asunto = await api<Asunto>('/asuntos', {
          method: 'POST',
          body: JSON.stringify({ cliente_id: Number(form.cliente_id), titulo: form.asunto_nuevo.trim() }),
        }, true);
        asuntoId = asunto.id;
      }
      const id = (value: string) => (value ? Number(value) : undefined);
      await api('/expedientes', {
        method: 'POST',
        body: JSON.stringify({
          titulo: form.titulo,
          cliente_id: Number(form.cliente_id),
          asunto_id: asuntoId,
          numero: form.numero || undefined,
          anio: form.anio ? Number(form.anio) : undefined,
          materia_id: id(form.materia_id),
          autoridad_id: id(form.autoridad_id),
          jurisdiccion_id: id(form.jurisdiccion_id),
          instancia_id: id(form.instancia_id),
          estatus_id: id(form.estatus_id),
          sede_id: id(form.sede_id),
          etapa: form.etapa || undefined,
        }),
      }, true);
      setForm(vacio);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el expediente.');
    }
  }

  const asuntosCliente = asuntos.filter((row) => String(row.cliente_id) === form.cliente_id);

  return (
    <DespachoShell>
      <PageTitle title="Expedientes" text="Cada expediente pertenece a un asunto del cliente. El número judicial puede quedar pendiente." />
      <Notice error={error} />
      <form onSubmit={create} className="mb-8 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-2">
        <select required className={inputClass} value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value, asunto_id: '' })}>
          <option value="">Cliente</option>
          {clientes.map((row) => <option key={row.id} value={row.id}>{row.nombre_completo}</option>)}
        </select>
        <select className={inputClass} value={form.asunto_id} onChange={(event) => setForm({ ...form, asunto_id: event.target.value })} disabled={!form.cliente_id}>
          <option value="">Asunto existente</option>
          {asuntosCliente.map((row) => <option key={row.id} value={row.id}>{row.titulo}</option>)}
        </select>
        <input className={inputClass} placeholder="O un asunto nuevo" value={form.asunto_nuevo} onChange={(event) => setForm({ ...form, asunto_nuevo: event.target.value })} />
        <input required minLength={2} className={inputClass} placeholder="Título del expediente" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} />
        <input className={inputClass} placeholder="Número" value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} />
        <input className={inputClass} type="number" min={1900} max={2200} placeholder="Año" value={form.anio} onChange={(event) => setForm({ ...form, anio: event.target.value })} />
        <select className={inputClass} value={form.materia_id} onChange={(event) => setForm({ ...form, materia_id: event.target.value })}>
          <option value="">Materia</option>
          {opciones('materia').map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={form.autoridad_id} onChange={(event) => setForm({ ...form, autoridad_id: event.target.value })}>
          <option value="">Autoridad</option>
          {autoridades.map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={form.jurisdiccion_id} onChange={(event) => setForm({ ...form, jurisdiccion_id: event.target.value })}>
          <option value="">Jurisdicción</option>
          {opciones('jurisdiccion').map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={form.instancia_id} onChange={(event) => setForm({ ...form, instancia_id: event.target.value })}>
          <option value="">Instancia</option>
          {opciones('instancia').map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={form.sede_id} onChange={(event) => setForm({ ...form, sede_id: event.target.value })}>
          <option value="">Sede</option>
          {opciones('sede').map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={form.estatus_id} onChange={(event) => setForm({ ...form, estatus_id: event.target.value })}>
          <option value="">Estatus</option>
          {opciones('estatus').map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <input className={`${inputClass} md:col-span-2`} placeholder="Etapa del proceso" value={form.etapa} onChange={(event) => setForm({ ...form, etapa: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-2">Abrir expediente</button>
      </form>
      {clientes.length === 0 ? <p className="mb-4 text-sm text-neutral-600">Para abrir un expediente, primero da de alta al cliente.</p> : null}
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {rows.map((row) => (
          <Link key={row.id} href={`/despacho/expedientes/${row.id}`} className="block px-4 py-3 hover:bg-neutral-50">
            <p className="font-medium">{numero(row) ? `${numero(row)} · ` : ''}{row.titulo}</p>
            <p className="text-sm text-neutral-600">
              {[row.cliente, row.materia_nombre, row.autoridad, row.estatus].filter(Boolean).join(' · ')}
            </p>
          </Link>
        ))}
        {rows.length === 0 ? <p className="px-4 py-4 text-sm text-neutral-500">Todavía no hay expedientes.</p> : null}
      </div>
    </DespachoShell>
  );
}
