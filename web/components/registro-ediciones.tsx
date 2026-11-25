'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Notice } from '@/components/panel-shell';

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
type Columna = 'fecha' | 'usuario' | 'que' | 'registro' | 'cambio';
type Orden = { columna: Columna; direccion: 'asc' | 'desc' } | null;

const TAMANOS = [10, 25, 50, 100, 200];
const fechaLarga = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const horaCorta = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
const cantidad = new Intl.NumberFormat('es-MX');

const campo =
  'h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-black';

function texto(valor: unknown) {
  if (valor == null || valor === '') return '—';
  return String(valor);
}

function cuando(fecha: string) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return `${fechaLarga.format(valor)}, ${horaCorta.format(valor)}`;
}

export function RegistroEdiciones({ alcance }: { alcance: 'plataforma' | 'despacho' }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [entidades, setEntidades] = useState<Respuesta['entidades']>([]);
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [orden, setOrden] = useState<Orden>(null);
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
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
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
        setError(reason instanceof ApiError ? reason.message : 'No se pudo cargar el registro de ediciones.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [page, pageSize, aplicados]);

  const filasOrdenadas = useMemo(() => {
    if (!orden) return filas;
    const valor: Record<Columna, (fila: Fila) => string> = {
      fecha: (fila) => fila.fecha,
      usuario: (fila) => fila.usuario,
      que: (fila) => fila.entidad_etiqueta,
      registro: (fila) => fila.referencia,
      cambio: (fila) => fila.resumen,
    };
    return [...filas].sort((a, b) => {
      const cmp = valor[orden.columna](a).localeCompare(valor[orden.columna](b), 'es', { numeric: true, sensitivity: 'base' });
      return orden.direccion === 'asc' ? cmp : -cmp;
    });
  }, [filas, orden]);

  function aplicarFechas(event: FormEvent) {
    event.preventDefault();
    setAplicados({ ...filtros, q: filtros.q.trim(), usuario: filtros.usuario.trim() });
    setPage(1);
  }

  function ordenar(columna: Columna) {
    setOrden((actual) => {
      if (!actual || actual.columna !== columna) return { columna, direccion: 'asc' };
      if (actual.direccion === 'asc') return { columna, direccion: 'desc' };
      return null;
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Registro de ediciones</h1>
        <p className="text-neutral-500">
          {alcance === 'plataforma'
            ? 'Quién cambió qué y cuándo: despachos, clientes, movimientos, caja y el resto de módulos que ya dejan rastro.'
            : 'Quién cambió qué y cuándo en este despacho.'}
        </p>
      </header>

      <Notice error={error} />
      <form onSubmit={aplicarFechas} className="space-y-2">
        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="space-y-1 text-sm">
            <span className="block">Desde</span>
            <input type="date" className={`${campo} sm:w-40`} value={filtros.desde} onChange={(event) => setFiltros({ ...filtros, desde: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block">Hasta</span>
            <input type="date" className={`${campo} sm:w-40`} value={filtros.hasta} onChange={(event) => setFiltros({ ...filtros, hasta: event.target.value })} />
          </label>
          <button className="h-9 bg-black px-4 text-sm font-medium text-white hover:bg-neutral-800">Filtrar fechas</button>
        </div>
        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="space-y-1 text-sm">
            <span className="block">Módulo</span>
            <select
              className={`${campo} sm:w-56`}
              value={filtros.entidad}
              onChange={(event) => {
                const entidad = event.target.value;
                setFiltros({ ...filtros, entidad });
                setAplicados({ ...filtros, entidad, q: filtros.q.trim(), usuario: filtros.usuario.trim() });
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {entidades.map((entidad) => (
                <option key={entidad.valor} value={entidad.valor}>
                  {entidad.etiqueta}
                </option>
              ))}
            </select>
          </label>
          {alcance === 'plataforma' ? (
            <label className="space-y-1 text-sm">
              <span className="block">Despacho</span>
              <select
                className={`${campo} sm:w-56`}
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
          <label className="space-y-1 text-sm">
            <span className="block">Usuario</span>
            <input className={`${campo} sm:w-48`} value={filtros.usuario} placeholder="Quién editó" onChange={(event) => setFiltros({ ...filtros, usuario: event.target.value })} />
          </label>
        </div>
        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="block">Buscar</span>
            <input className={campo} value={filtros.q} placeholder="Registro, campo, id…" onChange={(event) => setFiltros({ ...filtros, q: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral-500">
            Por página
            <select
              className={`${campo} w-20`}
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {TAMANOS.map((tamano) => (
                <option key={tamano} value={tamano}>
                  {tamano}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <p className="mt-4 text-sm text-neutral-500">
        {cantidad.format(total)} registro{total === 1 ? '' : 's'}
      </p>

      <div className={`relative mt-2 overflow-x-auto shadow-lg ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <Cabecera titulo="Fecha" columna="fecha" orden={orden} onSort={ordenar} />
              <Cabecera titulo="Usuario" columna="usuario" orden={orden} onSort={ordenar} />
              <Cabecera titulo="Qué" columna="que" orden={orden} onSort={ordenar} />
              <Cabecera titulo="Registro" columna="registro" orden={orden} onSort={ordenar} />
              <Cabecera titulo="Cambio" columna="cambio" orden={orden} onSort={ordenar} />
            </tr>
          </thead>
          <tbody>
            {filasOrdenadas.map((fila) => (
              <tr key={fila.id} className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50" onClick={() => setDetalle(fila)}>
                <td className="whitespace-nowrap p-4">{cuando(fila.fecha)}</td>
                <td className="p-4">{fila.usuario}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {fila.entidad_etiqueta}
                    {fila.tipo_cambio === 'alta' ? <Marca>Alta</Marca> : null}
                    {fila.tipo_cambio === 'baja' ? <Marca tono="baja">Baja</Marca> : null}
                  </span>
                </td>
                <td className="p-4">
                  <div>{fila.referencia}</div>
                  {alcance === 'plataforma' ? <div className="text-xs text-neutral-500">{fila.despacho}</div> : null}
                </td>
                <td className="max-w-md truncate p-4" title={fila.resumen}>
                  {fila.resumen}
                </td>
              </tr>
            ))}
            {!loading && filas.length === 0 ? (
              <tr>
                <td className="p-4 text-neutral-500" colSpan={5}>
                  No hay ediciones con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Paginacion page={page} totalPages={totalPages} onChange={setPage} />

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setDetalle(null)}>
          <article className="max-h-[80vh] w-full max-w-lg overflow-y-auto bg-white p-5 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <header className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {detalle.entidad_etiqueta} · {detalle.referencia}
              </h2>
              <button type="button" className="text-sm font-semibold" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </header>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-neutral-500">Usuario: </span>
                {detalle.usuario}
              </p>
              <p>
                <span className="text-neutral-500">Fecha: </span>
                {cuando(detalle.fecha)}
              </p>
              {alcance === 'plataforma' ? (
                <p>
                  <span className="text-neutral-500">Despacho: </span>
                  {detalle.despacho}
                </p>
              ) : null}
              <dl className="divide-y divide-neutral-200 border border-neutral-200">
                {Object.entries(detalle.campos).map(([clave, valor]) => (
                  <div key={clave} className="grid gap-1 px-3 py-2 sm:grid-cols-[140px_1fr]">
                    <dt className="text-neutral-500">{clave}</dt>
                    <dd>
                      {texto(valor?.anterior)} → {texto(valor?.nuevo)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function Cabecera({
  titulo,
  columna,
  orden,
  onSort,
}: {
  titulo: string;
  columna: Columna;
  orden: Orden;
  onSort: (columna: Columna) => void;
}) {
  const activo = orden?.columna === columna;
  const Icono = activo && orden.direccion === 'asc' ? ArrowUp : activo && orden.direccion === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className="h-12 px-4 text-left align-middle font-semibold">
      <button type="button" className="inline-flex items-center gap-1.5 font-semibold" onClick={() => onSort(columna)}>
        {titulo}
        <Icono className={`h-3.5 w-3.5 ${activo ? 'opacity-100' : 'opacity-70'}`} />
      </button>
    </th>
  );
}

function Marca({ children, tono = 'alta' }: { children: string; tono?: 'alta' | 'baja' }) {
  const color = tono === 'baja' ? 'bg-red-100 text-red-700' : 'bg-neutral-200 text-neutral-800';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>;
}

function Paginacion({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const total = Math.max(1, totalPages);
  const actual = Math.min(Math.max(1, page), total);
  const anteriores = [actual - 3, actual - 2, actual - 1].filter((numero) => numero >= 1);
  const siguientes = [actual + 1, actual + 2, actual + 3].filter((numero) => numero <= total);
  const ir = (numero: number) => onChange(Math.min(Math.max(1, numero), total));
  const boton = 'inline-flex h-8 min-w-8 items-center justify-center border border-neutral-300 bg-white px-2 text-sm disabled:opacity-40';

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
      <button type="button" className={boton} disabled={actual <= 1} onClick={() => ir(1)} aria-label="Primera">
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button type="button" className={boton} disabled={actual <= 1} onClick={() => ir(actual - 1)} aria-label="Anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {anteriores.map((numero) => (
        <button key={numero} type="button" className={boton} onClick={() => ir(numero)}>
          {numero}
        </button>
      ))}
      <span className="inline-flex h-8 w-16 items-center justify-center border border-neutral-300 text-sm">{actual}</span>
      {siguientes.map((numero) => (
        <button key={numero} type="button" className={boton} onClick={() => ir(numero)}>
          {numero}
        </button>
      ))}
      <button type="button" className={boton} disabled={actual >= total} onClick={() => ir(actual + 1)} aria-label="Siguiente">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button type="button" className={boton} disabled={actual >= total} onClick={() => ir(total)} aria-label="Última">
        <ChevronsRight className="h-4 w-4" />
      </button>
      <span className="ml-3 text-sm text-neutral-500">
        Página {actual} de {total}
      </span>
    </div>
  );
}
