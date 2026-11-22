'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Expediente = {
  id: number;
  titulo: string;
  cliente: string;
  juzgado: string | null;
  materia: string | null;
};

export default function DespachoPage() {
  const [rows, setRows] = useState<Expediente[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ titulo: '', cliente: '', juzgado: '', materia: '' });

  async function load() {
    setRows(await api<Expediente[]>('/expedientes', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los expedientes.'));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api(
        '/expedientes',
        {
          method: 'POST',
          body: JSON.stringify({
            titulo: form.titulo,
            cliente: form.cliente,
            juzgado: form.juzgado || undefined,
            materia: form.materia || undefined,
          }),
        },
        true,
      );
      setForm({ titulo: '', cliente: '', juzgado: '', materia: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el expediente.');
    }
  }

  return (
    <DespachoShell>
      <PageTitle
        title="Expedientes"
        text="Cada expediente guarda sus términos, promociones y escritos. Solo los ve este despacho."
      />
      <Notice error={error} />
      <form onSubmit={create} className="mb-8 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
        <input required minLength={2} className={inputClass} placeholder="Título del asunto" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} />
        <input required minLength={2} className={inputClass} placeholder="Cliente" value={form.cliente} onChange={(event) => setForm({ ...form, cliente: event.target.value })} />
        <input className={inputClass} placeholder="Juzgado" value={form.juzgado} onChange={(event) => setForm({ ...form, juzgado: event.target.value })} />
        <input className={inputClass} placeholder="Materia" value={form.materia} onChange={(event) => setForm({ ...form, materia: event.target.value })} />
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-2">Abrir expediente</button>
      </form>
      <div className="divide-y divide-neutral-200 border border-neutral-200">
        {rows.map((row) => (
          <Link key={row.id} href={`/despacho/expedientes/${row.id}`} className="block px-4 py-3 hover:bg-neutral-50">
            <p className="font-medium">{row.titulo}</p>
            <p className="text-sm text-neutral-600">
              {row.cliente}
              {row.materia ? ` · ${row.materia}` : ''}
              {row.juzgado ? ` · ${row.juzgado}` : ''}
            </p>
          </Link>
        ))}
        {rows.length === 0 ? <p className="px-4 py-4 text-sm text-neutral-500">Todavía no hay expedientes.</p> : null}
      </div>
    </DespachoShell>
  );
}
