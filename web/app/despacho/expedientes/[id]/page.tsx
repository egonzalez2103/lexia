'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, inputClass } from '@/components/panel-shell';
import { ApiError, api, fileHref, uploadArchivo } from '@/lib/api';

type Termino = { id: number; titulo: string; vence_el: string; estado: string; notas: string | null };
type Promocion = {
  id: number;
  titulo: string;
  juzgado: string | null;
  presentada_el: string;
  notas: string | null;
  archivo_url: string | null;
};
type Escrito = { id: number; titulo: string; cuerpo: string | null; estado: string; archivo_url: string | null };
type Expediente = {
  id: number;
  titulo: string;
  cliente: string;
  juzgado: string | null;
  materia: string | null;
  terminos: Termino[];
  promociones: Promocion[];
  escritos: Escrito[];
};

function day(value: string) {
  return String(value).slice(0, 10);
}

export default function ExpedientePage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Expediente | null>(null);
  const [error, setError] = useState('');
  const [termino, setTermino] = useState({ titulo: '', vence_el: '', notas: '' });
  const [promocion, setPromocion] = useState({ titulo: '', juzgado: '', presentada_el: '', notas: '' });
  const [escrito, setEscrito] = useState({ titulo: '', cuerpo: '' });
  const [archivoPromocion, setArchivoPromocion] = useState<File | null>(null);
  const [archivoEscrito, setArchivoEscrito] = useState<File | null>(null);

  async function load() {
    setRow(await api<Expediente>(`/expedientes/${params.id}`, {}, true));
  }

  useEffect(() => {
    if (!params.id) return;
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el expediente.'));
  }, [params.id]);

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el cambio.');
    }
  }

  async function addTermino(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api(`/expedientes/${params.id}/terminos`, { method: 'POST', body: JSON.stringify({ ...termino, notas: termino.notas || undefined }) }, true);
      setTermino({ titulo: '', vence_el: '', notas: '' });
    });
  }

  async function addPromocion(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const archivo_url = archivoPromocion ? await uploadArchivo(archivoPromocion) : undefined;
      await api(
        `/expedientes/${params.id}/promociones`,
        {
          method: 'POST',
          body: JSON.stringify({
            titulo: promocion.titulo,
            juzgado: promocion.juzgado || undefined,
            presentada_el: promocion.presentada_el,
            notas: promocion.notas || undefined,
            archivo_url,
          }),
        },
        true,
      );
      setPromocion({ titulo: '', juzgado: '', presentada_el: '', notas: '' });
      setArchivoPromocion(null);
    });
  }

  async function addEscrito(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const archivo_url = archivoEscrito ? await uploadArchivo(archivoEscrito) : undefined;
      await api(
        `/expedientes/${params.id}/escritos`,
        {
          method: 'POST',
          body: JSON.stringify({
            titulo: escrito.titulo,
            cuerpo: escrito.cuerpo || undefined,
            archivo_url,
          }),
        },
        true,
      );
      setEscrito({ titulo: '', cuerpo: '' });
      setArchivoEscrito(null);
    });
  }

  return (
    <DespachoShell>
      <p className="mb-3 text-sm">
        <Link href="/despacho" className="underline">
          Expedientes
        </Link>
      </p>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{row?.titulo ?? 'Expediente'}</h1>
        {row ? (
          <p className="mt-2 text-neutral-600">
            {row.cliente}
            {row.materia ? ` · ${row.materia}` : ''}
            {row.juzgado ? ` · ${row.juzgado}` : ''}
          </p>
        ) : null}
      </header>
      <Notice error={error} />

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Términos</h2>
        <form onSubmit={addTermino} className="mb-3 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Qué vence" value={termino.titulo} onChange={(event) => setTermino({ ...termino, titulo: event.target.value })} />
          <input required type="date" className={inputClass} value={termino.vence_el} onChange={(event) => setTermino({ ...termino, vence_el: event.target.value })} />
          <input className={`${inputClass} md:col-span-2`} placeholder="Notas" value={termino.notas} onChange={(event) => setTermino({ ...termino, notas: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Agregar término</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {row?.terminos.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.titulo}</p>
                <p className="text-neutral-600">Vence el {day(item.vence_el)}{item.notas ? ` · ${item.notas}` : ''}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="underline"
                  onClick={() => run(() => api(`/terminos/${item.id}`, { method: 'PATCH', body: JSON.stringify({ estado: item.estado === 'cumplido' ? 'pendiente' : 'cumplido' }) }, true).then(() => undefined))}
                >
                  {item.estado === 'cumplido' ? 'Cumplido' : 'Pendiente'}
                </button>
                <button type="button" className="underline" onClick={() => run(() => api(`/terminos/${item.id}`, { method: 'DELETE' }, true).then(() => undefined))}>
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Promociones</h2>
        <form onSubmit={addPromocion} className="mb-3 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Promoción" value={promocion.titulo} onChange={(event) => setPromocion({ ...promocion, titulo: event.target.value })} />
          <input className={inputClass} placeholder="Juzgado" value={promocion.juzgado} onChange={(event) => setPromocion({ ...promocion, juzgado: event.target.value })} />
          <input required type="date" className={inputClass} value={promocion.presentada_el} onChange={(event) => setPromocion({ ...promocion, presentada_el: event.target.value })} />
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="text-sm" onChange={(event) => setArchivoPromocion(event.target.files?.[0] ?? null)} />
          <input className={`${inputClass} md:col-span-2`} placeholder="Notas" value={promocion.notas} onChange={(event) => setPromocion({ ...promocion, notas: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Registrar promoción</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {row?.promociones.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.titulo}</p>
                <p className="text-neutral-600">
                  Presentada el {day(item.presentada_el)}
                  {item.juzgado ? ` · ${item.juzgado}` : ''}
                  {item.archivo_url ? (
                    <>
                      {' · '}
                      <a className="underline" href={fileHref(item.archivo_url)} target="_blank" rel="noreferrer">
                        Ver archivo
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <button type="button" className="underline" onClick={() => run(() => api(`/promociones/${item.id}`, { method: 'DELETE' }, true).then(() => undefined))}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Escritos</h2>
        <form onSubmit={addEscrito} className="mb-3 grid gap-3 border border-neutral-200 p-4">
          <input required minLength={2} className={inputClass} placeholder="Título del escrito" value={escrito.titulo} onChange={(event) => setEscrito({ ...escrito, titulo: event.target.value })} />
          <textarea className={`${inputClass} h-28 py-2`} placeholder="Texto del escrito" value={escrito.cuerpo} onChange={(event) => setEscrito({ ...escrito, cuerpo: event.target.value })} />
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="text-sm" onChange={(event) => setArchivoEscrito(event.target.files?.[0] ?? null)} />
          <button className="h-9 bg-black text-sm font-medium text-white">Guardar escrito</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {row?.escritos.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{item.titulo}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => run(() => api(`/escritos/${item.id}`, { method: 'PATCH', body: JSON.stringify({ estado: item.estado === 'cerrado' ? 'borrador' : 'cerrado' }) }, true).then(() => undefined))}
                  >
                    {item.estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
                  </button>
                  <button type="button" className="underline" onClick={() => run(() => api(`/escritos/${item.id}`, { method: 'DELETE' }, true).then(() => undefined))}>
                    Quitar
                  </button>
                </div>
              </div>
              {item.cuerpo ? <p className="mt-2 whitespace-pre-wrap text-neutral-700">{item.cuerpo}</p> : null}
              {item.archivo_url ? (
                <a className="mt-2 inline-block underline" href={fileHref(item.archivo_url)} target="_blank" rel="noreferrer">
                  Ver archivo
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </DespachoShell>
  );
}
