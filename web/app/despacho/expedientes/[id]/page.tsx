'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DespachoShell } from '@/components/despacho-shell';
import { ExpedienteOperacion } from '@/components/expediente-operacion';
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
type Parte = { id: number; nombre: string; caracter: string };
type Vinculo = { id: number; tipo: string; relacionado_id: number; relacionado: { id: number; titulo?: string; numero: string | null; anio: number | null; folio: string | null } | null };
type Expediente = {
  id: number;
  folio: string | null;
  titulo: string;
  cliente: string;
  cliente_id: number | null;
  asunto_id: number | null;
  asunto: string | null;
  numero: string | null;
  anio: number | null;
  autoridad_id: number | null;
  sede_id: number | null;
  jurisdiccion_id: number | null;
  materia_id: number | null;
  instancia_id: number | null;
  estatus_id: number | null;
  etapa: string | null;
  autoridad: string | null;
  sede: string | null;
  jurisdiccion: string | null;
  materia_nombre: string | null;
  instancia: string | null;
  estatus: string | null;
  terminos: Termino[];
  promociones: Promocion[];
  escritos: Escrito[];
  partes: Parte[];
  vinculos: Vinculo[];
};
type Cliente = { id: number; nombre_completo: string };
type Asunto = { id: number; cliente_id: number; titulo: string };
type Catalogo = { id: number; tipo: string; nombre: string };
type Autoridad = { id: number; nombre: string };
type Resumen = { id: number; titulo: string; numero: string | null; anio: number | null; folio: string | null };

const VINCULOS: [string, string][] = [
  ['toca', 'Toca'],
  ['amparo_directo', 'Amparo directo'],
  ['amparo_indirecto', 'Amparo indirecto'],
  ['carpeta', 'Carpeta de investigación'],
  ['incidente', 'Incidente'],
  ['causa', 'Causa penal'],
  ['cuaderno', 'Cuaderno'],
  ['ejecucion', 'Ejecución'],
  ['otro', 'Otro vínculo'],
];

function etiquetaVinculo(tipo: string) {
  return VINCULOS.find(([id]) => id === tipo)?.[1] ?? tipo;
}

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asuntos, setAsuntos] = useState<Asunto[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [autoridades, setAutoridades] = useState<Autoridad[]>([]);
  const [hermanos, setHermanos] = useState<Resumen[]>([]);
  const [ficha, setFicha] = useState({ titulo: '', cliente_id: '', asunto_id: '', numero: '', anio: '', materia_id: '', autoridad_id: '', jurisdiccion_id: '', instancia_id: '', estatus_id: '', sede_id: '', etapa: '' });
  const [parte, setParte] = useState({ nombre: '', caracter: '' });
  const [vinculo, setVinculo] = useState({ relacionado_id: '', tipo: 'toca' });

  async function load() {
    const expediente = await api<Expediente>(`/expedientes/${params.id}`, {}, true);
    setRow(expediente);
    setFicha({
      titulo: expediente.titulo,
      cliente_id: expediente.cliente_id ? String(expediente.cliente_id) : '',
      asunto_id: expediente.asunto_id ? String(expediente.asunto_id) : '',
      numero: expediente.numero ?? '',
      anio: expediente.anio ? String(expediente.anio) : '',
      materia_id: expediente.materia_id ? String(expediente.materia_id) : '',
      autoridad_id: expediente.autoridad_id ? String(expediente.autoridad_id) : '',
      jurisdiccion_id: expediente.jurisdiccion_id ? String(expediente.jurisdiccion_id) : '',
      instancia_id: expediente.instancia_id ? String(expediente.instancia_id) : '',
      estatus_id: expediente.estatus_id ? String(expediente.estatus_id) : '',
      sede_id: expediente.sede_id ? String(expediente.sede_id) : '',
      etapa: expediente.etapa ?? '',
    });
  }

  useEffect(() => {
    if (!params.id) return;
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el expediente.'));
    Promise.all([
      api<{ data: Cliente[] }>('/clientes?pageSize=200', {}, true),
      api<Asunto[]>('/asuntos', {}, true),
      api<Catalogo[]>('/catalogos-juridicos', {}, true),
      api<Autoridad[]>('/autoridades', {}, true),
      api<Resumen[]>('/expedientes', {}, true),
    ]).then(([cartera, listaAsuntos, listaCatalogos, listaAutoridades, lista]) => {
      setClientes(cartera.data);
      setAsuntos(listaAsuntos);
      setCatalogos(listaCatalogos);
      setAutoridades(listaAutoridades);
      setHermanos(lista);
    }).catch(() => undefined);
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

  async function guardarFicha(event: FormEvent) {
    event.preventDefault();
    const catalogo = (actual: string, previo?: number | null) => {
      if (!actual && !previo) return undefined;
      return actual ? Number(actual) : null;
    };
    await run(async () => {
      await api(`/expedientes/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: ficha.titulo,
          cliente_id: ficha.cliente_id ? Number(ficha.cliente_id) : undefined,
          asunto_id: ficha.asunto_id ? Number(ficha.asunto_id) : null,
          numero: ficha.numero || null,
          anio: ficha.anio ? Number(ficha.anio) : null,
          materia_id: catalogo(ficha.materia_id, row?.materia_id),
          autoridad_id: catalogo(ficha.autoridad_id, row?.autoridad_id),
          jurisdiccion_id: catalogo(ficha.jurisdiccion_id, row?.jurisdiccion_id),
          instancia_id: catalogo(ficha.instancia_id, row?.instancia_id),
          estatus_id: catalogo(ficha.estatus_id, row?.estatus_id),
          sede_id: catalogo(ficha.sede_id, row?.sede_id),
          etapa: ficha.etapa || null,
        }),
      }, true);
    });
  }

  async function addParte(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api(`/expedientes/${params.id}/partes`, { method: 'POST', body: JSON.stringify(parte) }, true);
      setParte({ nombre: '', caracter: '' });
    });
  }

  async function addVinculo(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api(`/expedientes/${params.id}/vinculos`, {
        method: 'POST',
        body: JSON.stringify({ relacionado_id: Number(vinculo.relacionado_id), tipo: vinculo.tipo }),
      }, true);
      setVinculo({ relacionado_id: '', tipo: 'toca' });
    });
  }

  function opciones(tipo: string) {
    return catalogos.filter((item) => item.tipo === tipo);
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
            {[row.numero && row.anio ? `${row.numero}/${row.anio}` : row.folio, row.cliente, row.asunto, row.materia_nombre, row.autoridad, row.estatus].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </header>
      <Notice error={error} />
      {params.id ? <ExpedienteOperacion expedienteId={Number(params.id)} /> : null}

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Ficha</h2>
        {row && !row.cliente_id ? <p className="mb-3 text-sm text-neutral-600">Quedó anotado como {row.cliente}. Elige el cliente de la cartera para ligarlo.</p> : null}
        <form onSubmit={guardarFicha} className="grid gap-3 rounded-lg border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Título" value={ficha.titulo} onChange={(event) => setFicha({ ...ficha, titulo: event.target.value })} />
          <select className={inputClass} value={ficha.cliente_id} onChange={(event) => setFicha({ ...ficha, cliente_id: event.target.value, asunto_id: '' })}>
            <option value="">Cliente</option>
            {clientes.map((item) => <option key={item.id} value={item.id}>{item.nombre_completo}</option>)}
          </select>
          <select className={inputClass} value={ficha.asunto_id} onChange={(event) => setFicha({ ...ficha, asunto_id: event.target.value })}>
            <option value="">Sin asunto</option>
            {asuntos.filter((item) => String(item.cliente_id) === ficha.cliente_id).map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </select>
          <input className={inputClass} placeholder="Número" value={ficha.numero} onChange={(event) => setFicha({ ...ficha, numero: event.target.value })} />
          <input className={inputClass} type="number" placeholder="Año" value={ficha.anio} onChange={(event) => setFicha({ ...ficha, anio: event.target.value })} />
          <input className={inputClass} placeholder="Etapa" value={ficha.etapa} onChange={(event) => setFicha({ ...ficha, etapa: event.target.value })} />
          <select className={inputClass} value={ficha.materia_id} onChange={(event) => setFicha({ ...ficha, materia_id: event.target.value })}>
            <option value="">Materia</option>
            {opciones('materia').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select className={inputClass} value={ficha.autoridad_id} onChange={(event) => setFicha({ ...ficha, autoridad_id: event.target.value })}>
            <option value="">Autoridad</option>
            {autoridades.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select className={inputClass} value={ficha.jurisdiccion_id} onChange={(event) => setFicha({ ...ficha, jurisdiccion_id: event.target.value })}>
            <option value="">Jurisdicción</option>
            {opciones('jurisdiccion').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select className={inputClass} value={ficha.instancia_id} onChange={(event) => setFicha({ ...ficha, instancia_id: event.target.value })}>
            <option value="">Instancia</option>
            {opciones('instancia').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select className={inputClass} value={ficha.sede_id} onChange={(event) => setFicha({ ...ficha, sede_id: event.target.value })}>
            <option value="">Sede</option>
            {opciones('sede').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select className={inputClass} value={ficha.estatus_id} onChange={(event) => setFicha({ ...ficha, estatus_id: event.target.value })}>
            <option value="">Estatus</option>
            {opciones('estatus').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <button className="h-9 bg-black text-sm font-medium text-white md:col-span-2">Guardar ficha</button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Partes</h2>
        <form onSubmit={addParte} className="mb-3 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <input required minLength={2} className={inputClass} placeholder="Nombre" value={parte.nombre} onChange={(event) => setParte({ ...parte, nombre: event.target.value })} />
          <input required minLength={2} className={inputClass} placeholder="Carácter, por ejemplo actor o demandado" value={parte.caracter} onChange={(event) => setParte({ ...parte, caracter: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Agregar parte</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {row?.partes.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <p><span className="font-medium">{item.nombre}</span> · {item.caracter}</p>
              <button type="button" className="underline" onClick={() => run(() => api(`/partes/${item.id}`, { method: 'DELETE' }, true).then(() => undefined))}>Quitar</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Procesos vinculados</h2>
        <form onSubmit={addVinculo} className="mb-3 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <select required className={inputClass} value={vinculo.relacionado_id} onChange={(event) => setVinculo({ ...vinculo, relacionado_id: event.target.value })}>
            <option value="">Expediente</option>
            {hermanos.filter((item) => String(item.id) !== params.id).map((item) => (
              <option key={item.id} value={item.id}>{item.numero && item.anio ? `${item.numero}/${item.anio} · ` : ''}{item.titulo}</option>
            ))}
          </select>
          <select className={inputClass} value={vinculo.tipo} onChange={(event) => setVinculo({ ...vinculo, tipo: event.target.value })}>
            {VINCULOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <button className="h-9 bg-black text-sm font-medium text-white">Vincular</button>
        </form>
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {row?.vinculos.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <p>
                <span className="font-medium">{etiquetaVinculo(item.tipo)}</span>
                {item.relacionado ? ` · ${item.relacionado.titulo}` : ''}
              </p>
              <button type="button" className="underline" onClick={() => run(() => api(`/vinculos/${item.id}`, { method: 'DELETE' }, true).then(() => undefined))}>Quitar</button>
            </li>
          ))}
        </ul>
      </section>

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
