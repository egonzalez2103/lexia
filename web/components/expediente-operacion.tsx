'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api, fileHref, uploadArchivo } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';

type Actuacion = { id: number; tipo: string; titulo: string; fecha: string; clasificacion?: string };
type Documento = { id: number; titulo: string; clasificacion: string; archivo_url: string | null };

const CLASES = [
  ['interno', 'Interno'],
  ['compartible', 'Compartible con el cliente'],
  ['privilegiado', 'Privilegiado'],
  ['sensible', 'Sensible'],
  ['reservado', 'Reservado a dirección'],
];

export function ExpedienteOperacion({ expedienteId }: { expedienteId: number }) {
  const [actuaciones, setActuaciones] = useState<Actuacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [error, setError] = useState('');
  const [audiencia, setAudiencia] = useState({ titulo: '', fecha: '', hora: '', lugar: '' });
  const [documento, setDocumento] = useState({ titulo: '', clasificacion: 'interno', notas: '' });
  const [archivo, setArchivo] = useState<File | null>(null);

  async function load() {
    const [linea, docs] = await Promise.all([
      api<Actuacion[]>(`/actuaciones?expediente_id=${expedienteId}`, {}, true),
      api<Documento[]>(`/documentos?expediente_id=${expedienteId}`, {}, true),
    ]);
    setActuaciones(linea);
    setDocumentos(docs);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la actuación.'));
  }, [expedienteId]);

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar.');
    }
  }

  async function crearAudiencia(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/audiencias', { method: 'POST', body: JSON.stringify({ expediente_id: expedienteId, ...audiencia, hora: audiencia.hora || undefined, lugar: audiencia.lugar || undefined }) }, true);
      setAudiencia({ titulo: '', fecha: '', hora: '', lugar: '' });
    });
  }

  async function crearDocumento(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const archivo_url = archivo ? await uploadArchivo(archivo) : undefined;
      await api('/documentos', {
        method: 'POST',
        body: JSON.stringify({ expediente_id: expedienteId, titulo: documento.titulo, clasificacion: documento.clasificacion, notas: documento.notas || undefined, archivo_url }),
      }, true);
      setDocumento({ titulo: '', clasificacion: 'interno', notas: '' });
      setArchivo(null);
    });
  }

  return (
    <div className="mb-8 grid gap-8">
      <Notice error={error} />
      <section>
        <h2 className="mb-3 font-medium">Actuaciones</h2>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {actuaciones.map((row) => (
            <li key={`${row.tipo}-${row.id}`} className="px-4 py-3 text-sm">
              <p className="font-medium">{row.titulo}</p>
              <p className="text-neutral-600">{row.tipo} · {row.fecha}{row.clasificacion ? ` · ${row.clasificacion}` : ''}</p>
            </li>
          ))}
          {actuaciones.length === 0 ? <li className="px-4 py-4 text-sm text-neutral-500">Todavía no hay actuaciones.</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-medium">Audiencia</h2>
        <form onSubmit={crearAudiencia} className="grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Tipo de audiencia" value={audiencia.titulo} onChange={(event) => setAudiencia({ ...audiencia, titulo: event.target.value })} />
          <input required type="date" className={inputClass} value={audiencia.fecha} onChange={(event) => setAudiencia({ ...audiencia, fecha: event.target.value })} />
          <input type="time" className={inputClass} value={audiencia.hora} onChange={(event) => setAudiencia({ ...audiencia, hora: event.target.value })} />
          <input className={inputClass} placeholder="Lugar o sala" value={audiencia.lugar} onChange={(event) => setAudiencia({ ...audiencia, lugar: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Agendar</button>
        </form>
      </section>
      <section>
        <h2 className="mb-3 font-medium">Documentos</h2>
        <form onSubmit={crearDocumento} className="mb-3 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Título" value={documento.titulo} onChange={(event) => setDocumento({ ...documento, titulo: event.target.value })} />
          <select className={inputClass} value={documento.clasificacion} onChange={(event) => setDocumento({ ...documento, clasificacion: event.target.value })}>
            {CLASES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <input className={`${inputClass} md:col-span-2`} placeholder="Notas" value={documento.notas} onChange={(event) => setDocumento({ ...documento, notas: event.target.value })} />
          <input type="file" className="text-sm" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} />
          <button className="h-9 bg-black text-sm font-medium text-white">Guardar documento</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {documentos.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <p><span className="font-medium">{row.titulo}</span> · {row.clasificacion}</p>
              <span className="flex gap-3">
                {row.archivo_url ? <a className="underline" href={fileHref(row.archivo_url)} target="_blank" rel="noreferrer">Archivo</a> : null}
                <button type="button" className="underline" onClick={() => run(() => api(`/documentos/${row.id}`, { method: 'DELETE' }, true).then(() => undefined))}>Quitar</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
