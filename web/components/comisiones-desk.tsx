'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Printer, RefreshCw } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Linea = {
  id: number;
  concepto: string;
  cliente: string;
  fecha: string;
  cobrador: string;
  tipo_movimiento: string;
  despacho: string;
  porcentaje: number | null;
  pagado: number;
  comision: number;
  tipo: string;
  estado: 'pendiente' | 'pagada';
};

type Grupo = {
  usuario_id: number;
  nombre: string;
  total: number;
  pendiente: number;
  lineas: Linea[];
};

type Fila = {
  id: number;
  concepto: string;
  abogado_id: number;
  abogado: string;
  cobrador: string;
  cliente: string;
  monto: number;
  fecha: string;
  tipo: string;
  despacho: string;
};

type Resumen = {
  despacho_id: number;
  despacho: string;
  es_admin: boolean;
  desde: string;
  hasta: string;
  totales: { comision: number; pendiente: number; pagada: number; abogados: number; lineas: number };
  datos: { pagado: number; con_cliente: number; sin_cliente: number; ingresos: number };
  abogados: Array<{ id: number; name: string }>;
  grupos: Grupo[];
  filas: Fila[];
};

type Despacho = { id: number; name: string; is_active?: boolean };
type Orden = { columna: string; direccion: 'asc' | 'desc' } | null;
type Pago = { ids: number[]; nombre: string; total: number };

const TAMANOS = [10, 25, 50, 100];
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function ComisionesDesk({ elegirDespacho = false }: { elegirDespacho?: boolean }) {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [despachoId, setDespachoId] = useState('');
  const [tab, setTab] = useState<'corte' | 'datos'>('corte');
  const [semanaInicio, setSemanaInicio] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [borradorDesde, setBorradorDesde] = useState('');
  const [borradorHasta, setBorradorHasta] = useState('');
  const [abogado, setAbogado] = useState('');
  const [estado, setEstado] = useState('');
  const [porcentaje, setPorcentaje] = useState('10');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ordenCorte, setOrdenCorte] = useState<Orden>(null);
  const [ordenDatos, setOrdenDatos] = useState<Orden>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [data, setData] = useState<Resumen | null>(null);
  const [aviso, setAviso] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [pago, setPago] = useState<Pago | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [puedeOperar, setPuedeOperar] = useState(true);
  const fechasListas = Boolean(desde && hasta && semanaInicio);
  const listo = fechasListas && (!elegirDespacho || Boolean(despachoId));
  const semanaFin = semanaInicio ? sumarDias(semanaInicio, 6) : '';

  useEffect(() => {
    const sem = semanaDe(hoyIso());
    setSemanaInicio(sem.inicio);
    setDesde(sem.inicio);
    setHasta(sem.fin);
    setBorradorDesde(sem.inicio);
    setBorradorHasta(sem.fin);
    setPuedeOperar(!esPersonalSoloLectura('comisiones', 'insertar'));
  }, []);

  useEffect(() => {
    if (!elegirDespacho) return;
    api<Despacho[]>('/despachos', {}, true)
      .then((rows) => {
        const activos = rows.filter((row) => row.is_active !== false);
        setDespachos(activos);
        setDespachoId(activos[0] ? String(activos[0].id) : '');
      })
      .catch((reason) => setAviso(reason instanceof ApiError ? reason.message : 'No pudimos cargar los despachos.'));
  }, [elegirDespacho]);

  useEffect(() => {
    if (!listo) return;
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', despachoId);
    params.set('desde', desde);
    params.set('hasta', hasta);
    if (abogado) params.set('usuario_id', abogado);
    if (estado) params.set('estado', estado);
    let vivo = true;
    setCargando(true);
    api<Resumen>(`/comisiones?${params.toString()}`, {}, true)
      .then((rows) => {
        if (!vivo) return;
        setData(rows);
        setAviso('');
      })
      .catch((reason) => {
        if (vivo) setAviso(reason instanceof ApiError ? reason.message : 'No pudimos cargar las comisiones.');
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [listo, despachoId, desde, hasta, abogado, estado, recarga]);

  const admin = Boolean(data?.es_admin) && puedeOperar;
  const grupos = data?.grupos ?? [];
  const filas = data?.filas ?? [];
  const lineas = useMemo(
    () => grupos.flatMap((grupo) => grupo.lineas.map((linea) => ({ ...linea, abogado: grupo.nombre }))),
    [grupos],
  );
  const pendientes = lineas.filter((linea) => linea.estado !== 'pagada');
  const elegidas = lineas.filter((linea) => seleccion.has(linea.id));
  const totalSeleccionado = elegidas.reduce((total, linea) => total + linea.comision, 0);
  const todoMarcado = pendientes.length > 0 && pendientes.every((linea) => seleccion.has(linea.id));
  const algunoMarcado = pendientes.some((linea) => seleccion.has(linea.id));

  const origen = tab === 'corte' ? grupos : filas;
  const totalPages = Math.max(1, Math.ceil(origen.length / pageSize));
  const pagina = Math.min(page, totalPages);
  const gruposPagina = grupos.slice((pagina - 1) * pageSize, pagina * pageSize);
  const filasOrdenadas = ordenar(filas, ordenDatos, valorFila);
  const filasPagina = filasOrdenadas.slice((pagina - 1) * pageSize, pagina * pageSize);
  const fechasValidas = esYmd(borradorDesde) && esYmd(borradorHasta);
  const fechasDistintas = borradorDesde !== desde || borradorHasta !== hasta;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function aplicarFechas() {
    if (!esYmd(borradorDesde) || !esYmd(borradorHasta)) return;
    let inicio = borradorDesde;
    let fin = borradorHasta;
    if (inicio > fin) {
      const tmp = inicio;
      inicio = fin;
      fin = tmp;
    }
    setBorradorDesde(inicio);
    setBorradorHasta(fin);
    setDesde(inicio);
    setHasta(fin);
    setSemanaInicio(semanaDe(inicio).inicio);
    setPage(1);
    setSeleccion(new Set());
    setMensaje('');
  }

  function irHoy() {
    const hoy = hoyIso();
    const sem = semanaDe(hoy);
    setBorradorDesde(hoy);
    setBorradorHasta(hoy);
    setDesde(hoy);
    setHasta(hoy);
    setSemanaInicio(sem.inicio);
    setEstado('');
    setPage(1);
    setSeleccion(new Set());
    setMensaje('');
  }

  async function generar() {
    const pct = porcentaje.trim() === '' ? 10 : Number(porcentaje);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setAviso('El porcentaje debe estar entre 0 y 100.');
      return;
    }
    setOcupado(true);
    setAviso('');
    setMensaje('');
    try {
      const resp = await api<{ lineas_creadas: number; semana_inicio: string; semana_fin: string }>(
        '/comisiones/cortes',
        {
          method: 'POST',
          body: JSON.stringify({
            despacho_id: despachoId ? Number(despachoId) : undefined,
            fecha: semanaInicio,
            porcentaje: pct,
          }),
        },
        true,
      );
      setDesde(resp.semana_inicio);
      setHasta(resp.semana_fin);
      setBorradorDesde(resp.semana_inicio);
      setBorradorHasta(resp.semana_fin);
      setSemanaInicio(resp.semana_inicio);
      setEstado('');
      setPage(1);
      setSeleccion(new Set());
      setMensaje(resp.lineas_creadas === 0 ? 'No hay ingresos nuevos en esta semana.' : `Se agregaron ${resp.lineas_creadas} líneas.`);
      setRecarga((valor) => valor + 1);
    } catch (reason) {
      setAviso(reason instanceof ApiError ? reason.message : 'No pudimos generar el corte.');
    } finally {
      setOcupado(false);
    }
  }

  function abrirPago(nombre: string, elegidasPago: Array<{ id: number; comision: number }>) {
    setError('');
    setAviso('');
    setPago({
      ids: elegidasPago.map((linea) => linea.id),
      nombre,
      total: elegidasPago.reduce((total, linea) => total + linea.comision, 0),
    });
  }

  function pedirPagoSeleccion() {
    if (!elegidas.length) {
      setAviso('Selecciona las comisiones de un abogado para pagar.');
      return;
    }
    const nombres = new Set(elegidas.map((linea) => linea.abogado));
    if (nombres.size !== 1) {
      setAviso('Paga a un solo abogado a la vez.');
      return;
    }
    abrirPago([...nombres][0], elegidas);
  }

  function pedirPagoGrupo(grupo: Grupo) {
    const delGrupo = grupo.lineas.filter((linea) => linea.estado !== 'pagada' && seleccion.has(linea.id));
    const lineasPago = delGrupo.length ? delGrupo : grupo.lineas.filter((linea) => linea.estado !== 'pagada');
    if (!lineasPago.length) return;
    abrirPago(grupo.nombre, lineasPago);
  }

  async function confirmarPago() {
    if (!pago) return;
    setOcupado(true);
    setError('');
    try {
      await api(
        '/comisiones/pagar',
        {
          method: 'POST',
          body: JSON.stringify({ despacho_id: despachoId ? Number(despachoId) : undefined, ids: pago.ids }),
        },
        true,
      );
      setPago(null);
      setSeleccion(new Set());
      setMensaje('Comisiones marcadas como pagadas.');
      setRecarga((valor) => valor + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos marcar las comisiones.');
    } finally {
      setOcupado(false);
    }
  }

  function toggleLinea(id: number) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGrupo(grupo: Grupo, marcado: boolean) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      for (const linea of grupo.lineas) {
        if (linea.estado === 'pagada') continue;
        if (marcado) next.add(linea.id);
        else next.delete(linea.id);
      }
      return next;
    });
  }

  function toggleTodo(marcado: boolean) {
    setSeleccion(marcado ? new Set(pendientes.map((linea) => linea.id)) : new Set());
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-3xl font-bold">Comisiones</h2>
        <p className="mt-2 text-neutral-600">
          {tab === 'corte'
            ? `Periodo ${desde || '—'} → ${hasta || '—'}`
            : `Reporte de ingresos del ${desde || '—'} al ${hasta || '—'}.`}
        </p>
        {elegirDespacho ? (
          <label className="mt-4 block max-w-sm text-sm">
            <span className="mb-1 block text-neutral-500">Despacho</span>
            <select
              className={inputClass}
              value={despachoId}
              onChange={(event) => {
                setDespachoId(event.target.value);
                setAbogado('');
                setPage(1);
                setSeleccion(new Set());
                setMensaje('');
              }}
            >
              {despachos.length === 0 ? <option value="">Sin despachos</option> : null}
              {despachos.map((despacho) => (
                <option key={despacho.id} value={despacho.id}>
                  {despacho.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`h-9 rounded-md px-4 text-sm ${tab === 'corte' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-800'}`}
          onClick={() => {
            setTab('corte');
            setPage(1);
          }}
        >
          Corte semanal
        </button>
        <button
          type="button"
          className={`h-9 rounded-md px-4 text-sm ${tab === 'datos' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-800'}`}
          onClick={() => {
            setTab('datos');
            setPage(1);
          }}
        >
          Datos para comisiones
        </button>
      </div>

      {aviso ? (
        <div className="mb-4">
          <Notice error={aviso} />
        </div>
      ) : null}
      {mensaje ? <p className="mb-4 rounded-md bg-neutral-100 px-3 py-2 text-sm">{mensaje}</p> : null}

      {tab === 'corte' ? (
        <section className="mb-4 space-y-4 rounded-lg border border-neutral-200 p-4">
          {admin ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Semana vie–jue (generar corte)</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className={`${inputClass} sm:w-44`}
                      value={semanaInicio}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        setSemanaInicio(semanaDe(event.target.value).inicio);
                      }}
                    />
                    <span className="text-neutral-600">
                      {semanaInicio ? `${dmy(semanaInicio)} – ${dmy(semanaFin)}` : ''}
                    </span>
                  </span>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Porcentaje</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={`${inputClass} w-24`}
                    value={porcentaje}
                    onChange={(event) => setPorcentaje(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm disabled:opacity-40"
                  onClick={generar}
                  disabled={ocupado || !semanaInicio}
                >
                  <RefreshCw className="h-4 w-4" />
                  Generar / actualizar corte
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                La comisión se agrupa por el abogado del ingreso, no por quien lo registró. Pulsa Generar / actualizar corte para crear una línea por cada ingreso aplicado de la semana, con el porcentaje indicado. Una línea que ya existe conserva su porcentaje.
              </p>
            </>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Consultar desde</span>
              <input type="date" className={`${inputClass} sm:w-40`} value={borradorDesde} onChange={(event) => setBorradorDesde(event.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Hasta</span>
              <input type="date" className={`${inputClass} sm:w-40`} value={borradorHasta} onChange={(event) => setBorradorHasta(event.target.value)} />
            </label>
            <button type="button" className="h-9 rounded-md bg-black px-3 text-sm text-white disabled:opacity-40" disabled={!fechasValidas || !fechasDistintas} onClick={aplicarFechas}>
              Aplicar fechas
            </button>
            <button type="button" className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={irHoy}>
              Hoy
            </button>
            {admin ? (
              <label className="text-sm sm:min-w-52">
                <span className="mb-1 block font-medium">Abogado</span>
                <select
                  className={inputClass}
                  value={abogado}
                  onChange={(event) => {
                    setAbogado(event.target.value);
                    setPage(1);
                    setSeleccion(new Set());
                  }}
                >
                  <option value="">Todos los abogados</option>
                  {(data?.abogados ?? []).map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm">
              <span className="mb-1 block font-medium">Estado</span>
              <select
                className={inputClass}
                value={estado}
                onChange={(event) => {
                  setEstado(event.target.value);
                  setPage(1);
                  setSeleccion(new Set());
                }}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 sm:ml-auto">
              Por página
              <select
                className="h-9 rounded-md border border-neutral-300 bg-white px-2"
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
        </section>
      ) : (
        <section className="mb-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Desde</span>
            <input type="date" className={`${inputClass} sm:w-40`} value={borradorDesde} onChange={(event) => setBorradorDesde(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Hasta</span>
            <input type="date" className={`${inputClass} sm:w-40`} value={borradorHasta} onChange={(event) => setBorradorHasta(event.target.value)} />
          </label>
          <button type="button" className="h-9 rounded-md bg-black px-3 text-sm text-white disabled:opacity-40" disabled={!fechasValidas || !fechasDistintas} onClick={aplicarFechas}>
            Aplicar fechas
          </button>
          <button type="button" className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={irHoy}>
            Hoy
          </button>
          {admin ? (
            <label className="text-sm sm:min-w-52">
              <span className="mb-1 block font-medium">Abogado</span>
              <select
                className={inputClass}
                value={abogado}
                onChange={(event) => {
                  setAbogado(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los abogados</option>
                {(data?.abogados ?? []).map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={() => { if (!imprimirDatos(data)) setAviso('El navegador bloqueó la ventana de impresión.'); }}>
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={() => { if (!imprimirDatos(data)) setAviso('El navegador bloqueó la ventana de impresión.'); }}>
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm" onClick={() => descargarCsv(data)}>
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </section>
      )}

      {tab === 'corte' ? (
        <Banner
          celdas={[
            { etiqueta: 'Comisión (periodo)', valor: pesos.format(data?.totales.comision ?? 0) },
            { etiqueta: 'Pendiente', valor: pesos.format(data?.totales.pendiente ?? 0) },
            { etiqueta: 'Pagada', valor: pesos.format(data?.totales.pagada ?? 0) },
            { etiqueta: 'Abogados', valor: String(data?.totales.abogados ?? 0) },
            { etiqueta: 'Líneas', valor: String(data?.totales.lineas ?? 0) },
          ]}
        />
      ) : (
        <Banner
          celdas={[
            { etiqueta: 'Pagado (periodo)', valor: pesos.format(data?.datos.pagado ?? 0) },
            { etiqueta: 'Con cliente', valor: pesos.format(data?.datos.con_cliente ?? 0) },
            { etiqueta: 'Sin cliente', valor: pesos.format(data?.datos.sin_cliente ?? 0) },
            { etiqueta: 'Ingresos', valor: String(data?.datos.ingresos ?? 0) },
          ]}
        />
      )}

      {tab === 'corte' ? (
        <>
          {admin ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Marca
                  checked={todoMarcado}
                  indeterminate={!todoMarcado && algunoMarcado}
                  onChange={(marcado) => toggleTodo(marcado)}
                  disabled={!pendientes.length}
                />
                Seleccionar todo
              </label>
              <div className="flex items-center gap-3 text-sm">
                <span>
                  Seleccionado: {pesos.format(totalSeleccionado)} ({elegidas.length} {elegidas.length === 1 ? 'línea' : 'líneas'})
                </span>
                <button type="button" className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-40" disabled={!elegidas.length || ocupado} onClick={pedirPagoSeleccion}>
                  Pagar
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {gruposPagina.length === 0 ? (
              <p className="rounded-lg border border-neutral-200 px-3 py-8 text-center text-sm text-neutral-500">
                {cargando ? 'Cargando…' : 'Todavía no hay comisiones en este periodo.'}
              </p>
            ) : (
              gruposPagina.map((grupo) => {
                const pendientesGrupo = grupo.lineas.filter((linea) => linea.estado !== 'pagada');
                const marcadas = pendientesGrupo.filter((linea) => seleccion.has(linea.id)).length;
                const lineasOrdenadas = ordenar(grupo.lineas, ordenCorte, valorLinea);
                return (
                  <section key={grupo.usuario_id} className="overflow-hidden rounded-lg border border-neutral-200">
                    <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                      {admin ? (
                        <Marca
                          checked={pendientesGrupo.length > 0 && marcadas === pendientesGrupo.length}
                          indeterminate={marcadas > 0 && marcadas < pendientesGrupo.length}
                          onChange={(marcado) => toggleGrupo(grupo, marcado)}
                          disabled={!pendientesGrupo.length}
                        />
                      ) : null}
                      <strong className="uppercase">{grupo.nombre}</strong>
                      <span className="text-sm">Total {pesos.format(grupo.total)}</span>
                      <span className="text-sm text-neutral-600">Pendiente {pesos.format(grupo.pendiente)}</span>
                      <div className="ml-auto flex items-center gap-3 text-sm">
                        <button type="button" className="inline-flex items-center gap-1 text-neutral-700" onClick={() => { if (!imprimirGrupo(grupo, data?.desde ?? '', data?.hasta ?? '')) setAviso('El navegador bloqueó la ventana de impresión.'); }}>
                          <Printer className="h-4 w-4" /> Resumen / imprimir
                        </button>
                        {admin ? (
                          <button type="button" className="inline-flex h-8 items-center rounded-md bg-black px-3 text-white disabled:opacity-40" disabled={!pendientesGrupo.length || ocupado} onClick={() => pedirPagoGrupo(grupo)}>
                            Pagar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead className="bg-neutral-900 text-white">
                          <tr>
                            {admin ? <th className="w-10 px-3 py-2" /> : null}
                            <Th etiqueta="Concepto" columna="concepto" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Cliente" columna="cliente" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Fecha pago" columna="fecha" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Cobrador" columna="cobrador" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Movimiento" columna="tipo_movimiento" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Despacho" columna="despacho" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="%" columna="porcentaje" derecha orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Pagado" columna="pagado" derecha orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Comisión" columna="comision" derecha orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Tipo" columna="tipo" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                            <Th etiqueta="Estado" columna="estado" orden={ordenCorte} onSort={(columna) => setOrdenCorte(alternar(ordenCorte, columna))} />
                          </tr>
                        </thead>
                        <tbody>
                          {lineasOrdenadas.map((linea) => (
                            <tr key={linea.id} className="border-b border-neutral-200">
                              {admin ? (
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-black"
                                    checked={seleccion.has(linea.id)}
                                    disabled={linea.estado === 'pagada'}
                                    onChange={() => toggleLinea(linea.id)}
                                    aria-label={`Seleccionar ${linea.concepto}`}
                                  />
                                </td>
                              ) : null}
                              <td className="px-3 py-2">{linea.concepto}</td>
                              <td className="px-3 py-2">{linea.cliente}</td>
                              <td className="whitespace-nowrap px-3 py-2">{linea.fecha}</td>
                              <td className="px-3 py-2">{linea.cobrador}</td>
                              <td className="px-3 py-2">{linea.tipo_movimiento}</td>
                              <td className="px-3 py-2">{linea.despacho}</td>
                              <td className="px-3 py-2 text-right">{linea.porcentaje == null ? '—' : `${linea.porcentaje.toFixed(2)}%`}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right">{pesos.format(linea.pagado)}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{pesos.format(linea.comision)}</td>
                              <td className="px-3 py-2">{linea.tipo}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${linea.estado === 'pagada' ? 'bg-neutral-200 text-neutral-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {linea.estado === 'pagada' ? 'PAGADA' : 'PENDIENTE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <Th etiqueta="ID" columna="id" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Concepto" columna="concepto" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Abogado" columna="abogado" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Cobrador" columna="cobrador" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Cliente" columna="cliente" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Monto pagado" columna="monto" derecha orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Fecha de pago" columna="fecha" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Tipo" columna="tipo" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
                <Th etiqueta="Despacho" columna="despacho" orden={ordenDatos} onSort={(columna) => setOrdenDatos(alternar(ordenDatos, columna))} />
              </tr>
            </thead>
            <tbody>
              {filasPagina.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-neutral-500">
                    {cargando ? 'Cargando…' : 'No hay ingresos en este periodo.'}
                  </td>
                </tr>
              ) : (
                filasPagina.map((fila) => (
                  <tr key={fila.id} className="border-b border-neutral-200">
                    <td className="px-3 py-2">{fila.id}</td>
                    <td className="px-3 py-2">{fila.concepto}</td>
                    <td className="px-3 py-2">{fila.abogado}</td>
                    <td className="px-3 py-2">{fila.cobrador}</td>
                    <td className="px-3 py-2">{fila.cliente}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{pesos.format(fila.monto)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fechaCorta(fila.fecha)}</td>
                    <td className="px-3 py-2">{fila.tipo}</td>
                    <td className="px-3 py-2">{fila.despacho}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={pagina <= 1} onClick={() => setPage(1)}>
          «
        </button>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={pagina <= 1} onClick={() => setPage((valor) => valor - 1)}>
          ‹
        </button>
        <span className="inline-flex h-8 min-w-8 items-center justify-center border border-neutral-900 px-2">{pagina}</span>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={pagina >= totalPages} onClick={() => setPage((valor) => valor + 1)}>
          ›
        </button>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={pagina >= totalPages} onClick={() => setPage(totalPages)}>
          »
        </button>
        <span className="text-neutral-500">
          Página {pagina} de {totalPages}
        </span>
      </div>

      {pago ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Pagar comisiones</h3>
            <p className="mt-3 text-sm text-neutral-700">
              Se marcarán {pago.ids.length} {pago.ids.length === 1 ? 'línea' : 'líneas'} de {pago.nombre} por {pesos.format(pago.total)}.
            </p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="h-9 rounded-md border border-neutral-300 px-3 text-sm" disabled={ocupado} onClick={() => setPago(null)}>
                Cancelar
              </button>
              <button type="button" className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-40" disabled={ocupado} onClick={confirmarPago}>
                Pagar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Banner({ celdas }: { celdas: Array<{ etiqueta: string; valor: string }> }) {
  const columnas = ['grid-cols-2', 'grid-cols-2', 'grid-cols-2', 'grid-cols-2 sm:grid-cols-3', 'grid-cols-2 sm:grid-cols-4', 'grid-cols-2 sm:grid-cols-5'][celdas.length] ?? 'grid-cols-2';
  return (
    <div className={`grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 ${columnas}`}>
      {celdas.map((celda) => (
        <div key={celda.etiqueta} className="bg-white px-4 py-3">
          <p className="text-xs text-neutral-500">{celda.etiqueta}</p>
          <p className="mt-1 text-lg font-semibold">{celda.valor}</p>
        </div>
      ))}
    </div>
  );
}

function Th({
  etiqueta,
  columna,
  orden,
  onSort,
  derecha = false,
}: {
  etiqueta: string;
  columna: string;
  orden: Orden;
  onSort: (columna: string) => void;
  derecha?: boolean;
}) {
  const activo = orden?.columna === columna;
  return (
    <th className={`whitespace-nowrap px-3 py-2 font-medium ${derecha ? 'text-right' : ''}`}>
      <button type="button" className={`inline-flex items-center gap-1 text-white ${derecha ? 'ml-auto' : ''}`} onClick={() => onSort(columna)}>
        {etiqueta}
        {activo ? orden?.direccion === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-70" />}
      </button>
    </th>
  );
}

function Marca({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (marcado: boolean) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 accent-black"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

function valorLinea(linea: Linea, columna: string) {
  if (columna === 'porcentaje') return linea.porcentaje ?? -1;
  if (columna === 'pagado') return linea.pagado;
  if (columna === 'comision') return linea.comision;
  return String(linea[columna as keyof Linea] ?? '');
}

function valorFila(fila: Fila, columna: string) {
  if (columna === 'id') return fila.id;
  if (columna === 'monto') return fila.monto;
  return String(fila[columna as keyof Fila] ?? '');
}

function ordenar<T>(filas: T[], orden: Orden, valor: (fila: T, columna: string) => string | number) {
  if (!orden) return filas;
  return [...filas].sort((a, b) => {
    const va = valor(a, orden.columna);
    const vb = valor(b, orden.columna);
    const base = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return orden.direccion === 'asc' ? base : -base;
  });
}

function alternar(orden: Orden, columna: string): Orden {
  if (orden?.columna === columna) return { columna, direccion: orden.direccion === 'asc' ? 'desc' : 'asc' };
  return { columna, direccion: 'asc' };
}

function imprimirGrupo(grupo: Grupo, desde: string, hasta: string) {
  const cuerpo = grupo.lineas
    .map(
      (linea) => `<tr>
        <td>${esc(linea.concepto)}</td><td>${esc(linea.cliente)}</td><td>${esc(linea.fecha)}</td>
        <td>${esc(linea.cobrador)}</td><td class="num">${linea.porcentaje == null ? '—' : `${linea.porcentaje.toFixed(2)}%`}</td>
        <td class="num">${pesos.format(linea.pagado)}</td><td class="num">${pesos.format(linea.comision)}</td>
        <td>${esc(linea.estado === 'pagada' ? 'PAGADA' : 'PENDIENTE')}</td>
      </tr>`,
    )
    .join('');
  return imprimir(
    `Comisiones de ${grupo.nombre}`,
    `<h1>Comisiones de ${esc(grupo.nombre)}</h1><p>${esc(desde)} → ${esc(hasta)}</p><p>Total ${pesos.format(grupo.total)} · Pendiente ${pesos.format(grupo.pendiente)}</p>
    <table><thead><tr><th>Concepto</th><th>Cliente</th><th>Fecha pago</th><th>Cobrador</th><th>%</th><th>Pagado</th><th>Comisión</th><th>Estado</th></tr></thead><tbody>${cuerpo}</tbody></table>`,
  );
}

function imprimirDatos(data: Resumen | null) {
  if (!data) return false;
  const cuerpo = data.filas
    .map(
      (fila) => `<tr>
        <td>${fila.id}</td><td>${esc(fila.concepto)}</td><td>${esc(fila.abogado)}</td><td>${esc(fila.cobrador)}</td>
        <td>${esc(fila.cliente)}</td><td class="num">${pesos.format(fila.monto)}</td><td>${esc(fechaCorta(fila.fecha))}</td><td>${esc(fila.despacho)}</td>
      </tr>`,
    )
    .join('');
  return imprimir(
    `Ingresos ${data.desde} ${data.hasta}`,
    `<h1>Ingresos para comisiones</h1><p>${esc(data.despacho)} · ${esc(data.desde)} al ${esc(data.hasta)}</p><p>Pagado ${pesos.format(data.datos.pagado)} · ${data.datos.ingresos} ingresos</p>
    <table><thead><tr><th>ID</th><th>Concepto</th><th>Abogado</th><th>Cobrador</th><th>Cliente</th><th>Monto</th><th>Fecha</th><th>Despacho</th></tr></thead><tbody>${cuerpo}</tbody></table>`,
  );
}

function imprimir(titulo: string, html: string) {
  const ventana = window.open('', '_blank', 'noopener,noreferrer');
  if (!ventana) return false;
  ventana.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    body{font-family:system-ui,sans-serif;padding:24px;color:#111} h1{font-size:20px} table{border-collapse:collapse;width:100%;font-size:12px;margin-top:16px}
    th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left} th{background:#171717;color:#fff} td.num,th:nth-child(n){ } .num{text-align:right;white-space:nowrap}
  </style></head><body>${html}</body></html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
  return true;
}

function descargarCsv(data: Resumen | null) {
  if (!data) return;
  const encabezado = ['ID', 'Concepto', 'Abogado', 'Cobrador', 'Cliente', 'Monto pagado', 'Fecha de pago', 'Tipo', 'Despacho'];
  const lineas = data.filas.map((fila) => [fila.id, fila.concepto, fila.abogado, fila.cobrador, fila.cliente, fila.monto.toFixed(2), fila.fecha, fila.tipo, fila.despacho].map(csv).join(','));
  const blob = new Blob([`\uFEFF${[encabezado.map(csv).join(','), ...lineas].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `ingresos-comisiones-${data.desde}-${data.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function csv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter] ?? caracter);
}

function fechaCorta(iso: string) {
  const [anio, mes, diaMes] = iso.split('-');
  if (!anio || !mes || !diaMes) return iso || '—';
  return `${Number(diaMes)} ${MESES[Number(mes) - 1] ?? mes} ${anio.slice(2)}`;
}

function dmy(iso: string) {
  const [anio, mes, diaMes] = iso.split('-');
  if (!anio || !mes || !diaMes) return '';
  return `${diaMes}/${mes}/${anio}`;
}

function hoyIso() {
  return ymd(new Date());
}

function esYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function semanaDe(iso: string) {
  const [anio, mes, diaMes] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, diaMes);
  fecha.setDate(fecha.getDate() - ((fecha.getDay() - 5 + 7) % 7));
  const inicio = ymd(fecha);
  fecha.setDate(fecha.getDate() + 6);
  return { inicio, fin: ymd(fecha) };
}

function sumarDias(iso: string, dias: number) {
  const [anio, mes, diaMes] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, diaMes);
  fecha.setDate(fecha.getDate() + dias);
  return ymd(fecha);
}

function ymd(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
