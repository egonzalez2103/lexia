'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';

type Campo = { anterior: unknown; nuevo: unknown };

type Fila = {
  id: number;
  despacho: string;
  entidad_etiqueta: string;
  referencia: string;
  tipo_cambio: 'alta' | 'edicion' | 'baja';
  tipo_etiqueta: string;
  usuario: string;
  fecha: string;
  resumen: string;
  campos: Record<string, Campo>;
};

type Respuesta = {
  data: Fila[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  entidades: Array<{ valor: string; etiqueta: string }>;
};

type Despacho = { id: number; name: string };

const fechaHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function texto(valor: unknown) {
  if (valor == null || valor === '') return '—';
  return String(valor);
}

export function RegistroEdiciones({ alcance }: { alcance: 'plataforma' | 'despacho' }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [entidades, setEntidades] = useState<Respuesta['entidades']>([]);
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [filtros, setFiltros] = useState({
    q: '',
    usuario: '',
    entidad: '',
    despacho_id: '',
    desde: '',
    hasta: '',
  });
  const [aplicados, setAplicados] = useState(filtros);

  useEffect(() => {
    if (alcance !== 'plataforma') return;
    api<Despacho[]>('/despachos', {}, true)
      .then(setDespachos)
      .catch(() => setDespachos([]));
  }, [alcance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAplicados((actual) => ({ ...actual, q: filtros.q.trim(), usuario: filtros.usuario.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filtros.q, filtros.usuario]);

  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (aplicados.q) params.set('q', aplicados.q);
    if (aplicados.usuario) params.set('usuario', aplicados.usuario);
    if (aplicados.entidad) params.set('entidad', aplicados.entidad);
    if (aplicados.despacho_id) params.set('despacho_id', aplicados.despacho_id);
    if (aplicados.desde) params.set('desde', aplicados.desde);
    if (aplicados.hasta) params.set('hasta', aplicados.hasta);
    setLoading(true);
    api<Respuesta>(`/bitacora-ediciones?${params.toString()}`, {}, true)
      .then((resp) => {
        if (cancelado) return;
        setFilas(resp.data);
        setTotal(resp.total);
        setTotalPages(resp.totalPages);
        setEntidades(resp.entidades);
        setError('');
      })
      .catch((reason) => {
        if (cancelado) return;
        setFilas([]);
        setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar el registro de ediciones.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [page, aplicados]);

  function aplicarFechas(event: FormEvent) {
    event.preventDefault();
    setAplicados({ ...filtros, q: filtros.q.trim(), usuario: filtros.usuario.trim() });
    setPage(1);
  }

  return (
    <div>
      <Notice error={error} />
      <form onSubmit={aplicarFechas} className="mb-4 grid gap-3 border border-neutral-200 p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Desde</span>
          <input type="date" className={inputClass} value={filtros.desde} onChange={(event) => setFiltros({ ...filtros, desde: event.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Hasta</span>
          <input type="date" className={inputClass} value={filtros.hasta} onChange={(event) => setFiltros({ ...filtros, hasta: event.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Módulo</span>
          <select
            className={inputClass}
            value={filtros.entidad}
            onChange={(event) => {
              const entidad = event.target.value;
              setFiltros({ ...filtros, entidad });
              setAplicados({ ...filtros, entidad, q: filtros.q.trim(), usuario: filtros.usuario.trim() });
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {entidades.map((entidad) => (
              <option key={entidad.valor} value={entidad.valor}>
                {entidad.etiqueta}
              </option>
            ))}
          </select>
        </label>
        {alcance === 'plataforma' ? (
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Despacho</span>
            <select
              className={inputClass}
              value={filtros.despacho_id}
              onChange={(event) => {
                const despacho_id = event.target.value;
                setFiltros({ ...filtros, despacho_id });
                setAplicados({ ...filtros, despacho_id, q: filtros.q.trim(), usuario: filtros.usuario.trim() });
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="0">Plataforma</option>
              {despachos.map((despacho) => (
                <option key={despacho.id} value={despacho.id}>
                  {despacho.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Usuario</span>
          <input className={inputClass} value={filtros.usuario} placeholder="Quién lo hizo" onChange={(event) => setFiltros({ ...filtros, usuario: event.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Buscar</span>
          <input className={inputClass} value={filtros.q} placeholder="Registro o cambio" onChange={(event) => setFiltros({ ...filtros, q: event.target.value })} />
        </label>
        <div className="flex items-end">
          <button className="h-9 bg-black px-4 text-sm font-medium text-white">Filtrar fechas</button>
        </div>
      </form>

      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              {alcance === 'plataforma' ? <th className="px-3 py-2 font-medium">Despacho</th> : null}
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Módulo</th>
              <th className="px-3 py-2 font-medium">Registro</th>
              <th className="px-3 py-2 font-medium">Cambio</th>
              <th className="px-3 py-2 font-medium">Resumen</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="border-b border-neutral-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2">{fechaHora.format(new Date(fila.fecha))}</td>
                {alcance === 'plataforma' ? <td className="px-3 py-2">{fila.despacho}</td> : null}
                <td className="px-3 py-2">{fila.usuario}</td>
                <td className="px-3 py-2">{fila.entidad_etiqueta}</td>
                <td className="px-3 py-2">{fila.referencia}</td>
                <td className={`px-3 py-2 ${fila.tipo_cambio === 'baja' ? 'text-red-600' : 'font-medium'}`}>{fila.tipo_etiqueta}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-left underline decoration-neutral-300 underline-offset-2" onClick={() => setDetalle(fila)}>
                    {fila.resumen}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filas.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={alcance === 'plataforma' ? 7 : 6}>
                  Todavía no hay ediciones con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <p className="text-neutral-500">{loading ? 'Cargando…' : `${total} registro${total === 1 ? '' : 's'}`}</p>
        <div className="flex items-center gap-2">
          <button type="button" className="h-8 border border-neutral-300 px-3 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((actual) => actual - 1)}>
            Anterior
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button type="button" className="h-8 border border-neutral-300 px-3 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((actual) => actual + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setDetalle(null)}>
          <article className="max-h-[80vh] w-full max-w-lg overflow-y-auto bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">{detalle.tipo_etiqueta}</p>
                <h2 className="text-xl font-semibold">{detalle.referencia}</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {detalle.entidad_etiqueta} · {detalle.usuario} · {fechaHora.format(new Date(detalle.fecha))}
                </p>
              </div>
              <button type="button" className="text-sm font-semibold" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </header>
            <dl className="divide-y divide-neutral-200 border border-neutral-200">
              {Object.entries(detalle.campos).map(([clave, valor]) => (
                <div key={clave} className="grid gap-1 px-3 py-2 sm:grid-cols-[140px_1fr]">
                  <dt className="text-sm text-neutral-500">{clave}</dt>
                  <dd className="text-sm">
                    {texto(valor?.anterior)} → {texto(valor?.nuevo)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
      ) : null}
    </div>
  );
}
