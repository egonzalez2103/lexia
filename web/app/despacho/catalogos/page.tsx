'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Tipo = 'materia' | 'jurisdiccion' | 'instancia' | 'estatus' | 'sede';
type Catalogo = { id: number; tipo: Tipo; nombre: string; detalle: string | null; telefono: string | null };
type Autoridad = { id: number; nombre: string; materia_id: number | null; instancia_id: number | null };

const TIPOS: { id: Tipo; label: string; detalle: string }[] = [
  { id: 'materia', label: 'Materias', detalle: '' },
  { id: 'jurisdiccion', label: 'Jurisdicciones', detalle: 'Entidad federativa' },
  { id: 'instancia', label: 'Instancias', detalle: '' },
  { id: 'estatus', label: 'Estatus', detalle: '' },
  { id: 'sede', label: 'Sedes', detalle: 'Domicilio' },
];

export default function CatalogosJuridicosPage() {
  const [tipo, setTipo] = useState<Tipo>('materia');
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [autoridades, setAutoridades] = useState<Autoridad[]>([]);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [detalle, setDetalle] = useState('');
  const [telefono, setTelefono] = useState('');
  const [autoridad, setAutoridad] = useState({ nombre: '', materia_id: '', instancia_id: '' });
  const actual = TIPOS.find((item) => item.id === tipo) ?? TIPOS[0];

  async function load() {
    const [lista, cortes] = await Promise.all([
      api<Catalogo[]>('/catalogos-juridicos', {}, true),
      api<Autoridad[]>('/autoridades', {}, true),
    ]);
    setCatalogos(lista);
    setAutoridades(cortes);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los catálogos.'));
  }, []);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api(
        '/catalogos-juridicos',
        { method: 'POST', body: JSON.stringify({ tipo, nombre, detalle: actual.detalle ? detalle || undefined : undefined, telefono: tipo === 'sede' ? telefono || undefined : undefined }) },
        true,
      );
      setNombre('');
      setDetalle('');
      setTelefono('');
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el catálogo.');
    }
  }

  async function quitar(id: number) {
    setError('');
    try {
      await api(`/catalogos-juridicos/${id}`, { method: 'DELETE' }, true);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos quitar ese registro.');
    }
  }

  async function crearAutoridad(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api(
        '/autoridades',
        {
          method: 'POST',
          body: JSON.stringify({
            nombre: autoridad.nombre,
            materia_id: autoridad.materia_id ? Number(autoridad.materia_id) : null,
            instancia_id: autoridad.instancia_id ? Number(autoridad.instancia_id) : null,
          }),
        },
        true,
      );
      setAutoridad({ nombre: '', materia_id: '', instancia_id: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar la autoridad.');
    }
  }

  async function quitarAutoridad(id: number) {
    setError('');
    try {
      await api(`/autoridades/${id}`, { method: 'DELETE' }, true);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos quitar esa autoridad.');
    }
  }

  const visibles = catalogos.filter((row) => row.tipo === tipo);
  const materias = catalogos.filter((row) => row.tipo === 'materia');
  const instancias = catalogos.filter((row) => row.tipo === 'instancia');
  const nombreDe = (id: number | null) => catalogos.find((row) => row.id === id)?.nombre;

  return (
    <DespachoShell>
      <PageTitle title="Catálogos jurídicos" text="Materias, sedes, autoridades y estatus de este despacho. El amparo se vincula desde el expediente, no se guarda como una instancia." />
      <Notice error={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TIPOS.map((item) => (
          <button key={item.id} type="button" className={`rounded-lg px-3 py-2 text-sm font-medium ${tipo === item.id ? 'bg-black text-white' : 'bg-neutral-100'}`} onClick={() => { setTipo(item.id); setNombre(''); setDetalle(''); setTelefono(''); }}>
            {item.label}
          </button>
        ))}
      </div>
      <form onSubmit={crear} className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-2">
        <input required minLength={2} className={inputClass} placeholder="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
        {actual.detalle ? <input className={inputClass} placeholder={actual.detalle} value={detalle} onChange={(event) => setDetalle(event.target.value)} /> : null}
        {tipo === 'sede' ? <input className={inputClass} placeholder="Teléfono" value={telefono} onChange={(event) => setTelefono(event.target.value)} /> : null}
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-2">Agregar</button>
      </form>
      <ul className="mb-10 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {visibles.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{row.nombre}</p>
              {row.detalle || row.telefono ? <p className="text-neutral-600">{[row.detalle, row.telefono].filter(Boolean).join(' · ')}</p> : null}
            </div>
            <button type="button" className="underline" onClick={() => quitar(row.id)}>Quitar</button>
          </li>
        ))}
        {visibles.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">Todavía no hay registros.</li> : null}
      </ul>

      <h2 className="mb-3 text-lg font-semibold">Autoridades</h2>
      <form onSubmit={crearAutoridad} className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-3">
        <input required minLength={2} className={inputClass} placeholder="Juzgado, sala o tribunal" value={autoridad.nombre} onChange={(event) => setAutoridad({ ...autoridad, nombre: event.target.value })} />
        <select className={inputClass} value={autoridad.materia_id} onChange={(event) => setAutoridad({ ...autoridad, materia_id: event.target.value })}>
          <option value="">Materia</option>
          {materias.map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <select className={inputClass} value={autoridad.instancia_id} onChange={(event) => setAutoridad({ ...autoridad, instancia_id: event.target.value })}>
          <option value="">Instancia</option>
          {instancias.map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
        </select>
        <button className="h-9 bg-black text-sm font-medium text-white md:col-span-3">Agregar autoridad</button>
      </form>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {autoridades.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{row.nombre}</p>
              <p className="text-neutral-600">{[nombreDe(row.materia_id), nombreDe(row.instancia_id)].filter(Boolean).join(' · ') || 'Sin materia ni instancia'}</p>
            </div>
            <button type="button" className="underline" onClick={() => quitarAutoridad(row.id)}>Quitar</button>
          </li>
        ))}
        {autoridades.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">Todavía no hay autoridades.</li> : null}
      </ul>
    </DespachoShell>
  );
}
