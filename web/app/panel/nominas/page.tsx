'use client';

import { Calendar, Search, Upload } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { WeekCalendar } from '@/components/week-calendar';
import { Notice, PageTitle, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api, fileHref, uploadArchivo } from '@/lib/api';
import { currentMonday, etiquetaSemana } from '@/lib/week';

type Fila = {
  colaborador_id: number;
  colaborador: string;
  puesto: string;
  sueldo_semanal: number;
  estimado: number;
  pagado: number;
  pagado_efectivo: number;
  pagado_transferencia: number;
  diferencia: number;
  recibo: string | null;
};

type Pago = {
  id: number;
  colaborador: string;
  forma_pago: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
};

type Resumen = {
  semana: { inicio: string; fin: string; comprobante: string | null; pagos_electronicos: number };
  colaboradores: Fila[];
  pagos: Pago[];
  resumen: {
    estimado: number;
    pagado: number;
    diferencia: number;
    colaboradores: number;
    firmados: number;
    pendientes_recibo: number;
    falta_comprobante: boolean;
  };
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FORMAS = ['Transferencia', 'Efectivo', 'Deposito', 'Tarjeta'] as const;

function claseDiferencia(valor: number) {
  if (Math.abs(valor) < 0.005) return 'text-emerald-700';
  if (valor < 0) return 'text-amber-700';
  return 'text-sky-700';
}

function textoDiferencia(valor: number) {
  if (Math.abs(valor) < 0.005) return 'Cuadra con el sueldo';
  if (valor < 0) return 'Falta por pagar';
  return 'Pagado de más';
}

export default function NominasPage() {
  const [semana, setSemana] = useState(currentMonday);
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'todas' | 'pendiente' | 'firmadas'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [colaboradorId, setColaboradorId] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagoDe, setPagoDe] = useState<number | null>(null);
  const [reciboDe, setReciboDe] = useState<Fila | null>(null);

  async function load(value = semana) {
    setData(await api<Resumen>(`/nominas/semana?semana=${value}`, {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la nómina.'));
  }, []);

  async function chooseWeek(monday: string) {
    setSemana(monday);
    setError('');
    try {
      await load(monday);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la nómina.');
    }
  }

  async function guardar(path: string, body: unknown) {
    setError('');
    try {
      setData(await api<Resumen>(path, { method: 'POST', body: JSON.stringify(body) }, true));
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar.');
      return false;
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.colaboradores ?? []).filter((row) => {
      if (colaboradorId && row.colaborador_id !== colaboradorId) return false;
      if (!q) return true;
      return `${row.colaborador} ${row.puesto}`.toLowerCase().includes(q);
    });
  }, [busqueda, colaboradorId, data]);

  const filas = useMemo(() => {
    if (tab === 'pendiente') return filtrados.filter((row) => !row.recibo);
    if (tab === 'firmadas') return filtrados.filter((row) => Boolean(row.recibo));
    return filtrados;
  }, [filtrados, tab]);

  const totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pagina = filas.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const resumen = data?.resumen;
  const conteos = {
    todas: filtrados.length,
    pendiente: filtrados.filter((row) => !row.recibo).length,
    firmadas: filtrados.filter((row) => row.recibo).length,
  };

  return (
    <PanelShell>
      <PageTitle
        title="Nóminas"
        text="Semana de lunes a domingo. El estimado usa el sueldo semanal del colaborador y se compara con lo pagado."
      />
      <Notice error={error} />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="grid min-w-[280px] gap-1 text-sm">
          Semana
          <WeekField value={semana} onChange={chooseWeek} />
        </label>
        <label className="grid min-w-[220px] flex-1 gap-1 text-sm">
          Colaborador
          <select className={inputClass} value={colaboradorId} onChange={(event) => { setColaboradorId(Number(event.target.value)); setPage(1); }}>
            <option value={0}>Todos</option>
            {(data?.colaboradores ?? []).map((row) => (
              <option key={row.colaborador_id} value={row.colaborador_id}>
                {row.colaborador}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="h-9 shrink-0 bg-black px-4 text-sm font-medium text-white" onClick={() => setPagoDe(0)}>
          Registrar pago
        </button>
      </div>

      {resumen?.pendientes_recibo ? (
        <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Faltan {resumen.pendientes_recibo} recibo{resumen.pendientes_recibo === 1 ? '' : 's'} de colaboradores ya pagados.
        </p>
      ) : null}
      {resumen?.falta_comprobante ? (
        <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Falta el comprobante de las transferencias de esta semana.
        </p>
      ) : null}

      {resumen ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card titulo="Estimado" valor={pesos.format(resumen.estimado)} detalle={`${resumen.colaboradores} colaborador${resumen.colaboradores === 1 ? '' : 'es'}`} />
          <Card titulo="Pagado" valor={pesos.format(resumen.pagado)} detalle={`${data?.pagos.length ?? 0} pago${data?.pagos.length === 1 ? '' : 's'}`} />
          <Card titulo="Diferencia" valor={pesos.format(resumen.diferencia)} detalle={textoDiferencia(resumen.diferencia)} className={claseDiferencia(resumen.diferencia)} />
          <Card
            titulo="Recibos cargados"
            valor={`${resumen.firmados}/${resumen.firmados + resumen.pendientes_recibo}`}
            detalle={resumen.pendientes_recibo > 0 ? `${resumen.pendientes_recibo} pendientes` : 'Sin pendientes'}
          />
        </div>
      ) : null}

      {data ? (
        <section className="mb-8">
          <h2 className="text-lg font-semibold">Comprobante de transferencias</h2>
          <p className="mt-1 text-sm text-neutral-600">Un comprobante por semana, para todas las transferencias juntas.</p>
          <div className="mt-3 rounded-lg border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{etiquetaSemana(data.semana.inicio, data.semana.fin)}</p>
              <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs">
                {data.semana.comprobante ? 'Cargado' : data.semana.pagos_electronicos > 0 ? 'Falta comprobante' : 'Sin transferencias'}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {data.semana.pagos_electronicos === 1
                ? '1 pago electrónico en la semana.'
                : `${data.semana.pagos_electronicos} pagos electrónicos en la semana.`}
            </p>
            <p className="mt-3 text-sm font-medium">Comprobante</p>
            <ComprobanteForm
              key={data.semana.comprobante ?? 'vacio'}
              cargado={Boolean(data.semana.comprobante)}
              href={data.semana.comprobante}
              onSave={(archivo_url) => guardar('/nominas/semana/comprobante', { semana, archivo_url })}
            />
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Colaboradores de la semana</h2>
        <div className="mb-3 inline-flex rounded-lg bg-neutral-100 p-1 text-sm">
          {(
            [
              ['todas', `Todas (${conteos.todas})`],
              ['pendiente', `Sin recibo (${conteos.pendiente})`],
              ['firmadas', `Con recibo (${conteos.firmadas})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-md px-3 py-1.5 ${tab === id ? 'bg-white font-medium shadow-sm' : 'text-neutral-600'}`}
              onClick={() => { setTab(id); setPage(1); }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Buscar colaborador..."
              value={busqueda}
              onChange={(event) => { setBusqueda(event.target.value); setPage(1); }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Por página
            <select className="h-9 rounded-md border border-neutral-300 bg-white px-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-3 py-2 font-medium">Colaborador</th>
                <th className="px-3 py-2 font-medium">Sueldo</th>
                <th className="px-3 py-2 font-medium">Estimado</th>
                <th className="px-3 py-2 font-medium">Pagado</th>
                <th className="px-3 py-2 font-medium">Efectivo<span className="block text-xs font-normal text-neutral-300">Caja general</span></th>
                <th className="px-3 py-2 font-medium">Transferencia</th>
                <th className="px-3 py-2 font-medium">Diferencia</th>
                <th className="px-3 py-2 font-medium">Recibo</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((row) => (
                <tr key={row.colaborador_id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 uppercase">{row.colaborador}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(row.sueldo_semanal)}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(row.estimado)}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(row.pagado)}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(row.pagado_efectivo)}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(row.pagado_transferencia)}</td>
                  <td className={`px-3 py-2 tabular-nums ${claseDiferencia(row.diferencia)}`}>{pesos.format(row.diferencia)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.recibo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {row.recibo ? 'Cargado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-2 text-xs" onClick={() => setReciboDe(row)}>
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        {row.recibo ? 'Ver' : 'Subir recibo'}
                      </button>
                      <button type="button" className="h-8 rounded-md bg-black px-3 text-xs font-medium text-white" onClick={() => setPagoDe(row.colaborador_id)}>
                        Pagar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagina.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-neutral-500">
                    No hay colaboradores para esta semana.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {filas.length > pageSize ? (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="rounded-md border px-2 py-1 disabled:opacity-40" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Anterior</button>
            <span>{pageSafe} / {totalPages}</span>
            <button type="button" className="rounded-md border px-2 py-1 disabled:opacity-40" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>Siguiente</button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Pagos registrados</h2>
        <p className="mb-3 mt-1 text-sm text-neutral-600">Movimientos cuya semana de nómina coincide con la selección.</p>
        <div className="overflow-x-auto border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Periodo</th>
                <th className="px-3 py-2 font-medium">Colaborador</th>
                <th className="px-3 py-2 font-medium">Forma de pago</th>
                <th className="px-3 py-2 font-medium">Monto</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pagos ?? []).map((pago) => (
                <tr key={pago.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2">{pago.fecha}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{data ? etiquetaSemana(data.semana.inicio, data.semana.fin) : '—'}</td>
                  <td className="px-3 py-2">{pago.colaborador}</td>
                  <td className="px-3 py-2">{pago.forma_pago}</td>
                  <td className="px-3 py-2 tabular-nums">{pesos.format(pago.monto)}</td>
                  <td className="px-3 py-2">{pago.descripcion || '—'}</td>
                </tr>
              ))}
              {(data?.pagos.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-neutral-500">
                    Esta semana todavía no tiene pagos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {pagoDe !== null && data ? (
        <PagoDialog
          personas={data.colaboradores}
          inicial={pagoDe}
          onClose={() => setPagoDe(null)}
          onSave={async (body) => {
            const ok = await guardar('/nominas/pagos', { ...body, semana });
            if (ok) setPagoDe(null);
          }}
        />
      ) : null}
      {reciboDe ? (
        <ReciboDialog
          fila={reciboDe}
          onClose={() => setReciboDe(null)}
          onSave={async (archivo_url) => {
            const ok = await guardar('/nominas/recibos', { semana, colaborador_id: reciboDe.colaborador_id, archivo_url });
            if (ok) setReciboDe(null);
          }}
        />
      ) : null}
    </PanelShell>
  );
}

function WeekField({ value, onChange }: { value: string; onChange: (monday: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" className={`${inputClass} flex items-center justify-between text-left`} onClick={() => setOpen((current) => !current)}>
        <span className="truncate">{etiquetaSemana(value)}</span>
        <Calendar className="h-4 w-4 shrink-0 text-neutral-500" />
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 bg-white shadow-lg">
          <WeekCalendar
            value={value}
            onChange={(monday) => {
              onChange(monday);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function Card({ titulo, valor, detalle, className = '' }: { titulo: string; valor: string; detalle: string; className?: string }) {
  return (
    <article className="rounded-lg border border-neutral-200 p-4">
      <p className="text-sm text-neutral-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${className}`}>{valor}</p>
      <p className="mt-1 text-sm text-neutral-500">{detalle}</p>
    </article>
  );
}

function ComprobanteForm({
  cargado,
  href,
  onSave,
}: {
  cargado: boolean;
  href: string | null;
  onSave: (url: string) => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallo, setFallo] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setFallo('');
    try {
      const url = await uploadArchivo(file);
      const ok = await onSave(url);
      if (ok) setFile(null);
    } catch (reason) {
      setFallo(reason instanceof ApiError ? reason.message : 'No pudimos subir el archivo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-3">
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm">
        <Upload className="h-4 w-4" />
        {cargado ? 'Reemplazar comprobante' : 'Subir comprobante'}
        <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <span className="text-sm text-neutral-500">{file ? file.name : 'PDF o imagen'}</span>
      <button disabled={!file || busy} className="ml-auto h-9 rounded-md border border-neutral-300 px-4 text-sm disabled:opacity-40">
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
      {href ? (
        <a className="text-sm underline" href={fileHref(href)} target="_blank" rel="noreferrer">
          Ver
        </a>
      ) : null}
      {fallo ? <p className="w-full text-sm text-red-600">{fallo}</p> : null}
    </form>
  );
}

function PagoDialog({
  personas,
  inicial,
  onClose,
  onSave,
}: {
  personas: Fila[];
  inicial: number;
  onClose: () => void;
  onSave: (body: { colaborador_id: number; forma_pago: string; monto: number; descripcion?: string }) => Promise<void>;
}) {
  const inicialFila = personas.find((row) => row.colaborador_id === inicial);
  const [colaboradorId, setColaboradorId] = useState(inicialFila?.colaborador_id ?? personas[0]?.colaborador_id ?? 0);
  const [forma, setForma] = useState<(typeof FORMAS)[number]>('Transferencia');
  const fila = personas.find((row) => row.colaborador_id === colaboradorId);
  const falta = Math.max(0, round2((fila?.estimado ?? 0) - (fila?.pagado ?? 0)));
  const [monto, setMonto] = useState(falta ? String(falta) : '');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);

  function elegir(id: number) {
    const next = personas.find((row) => row.colaborador_id === id);
    const restante = Math.max(0, round2((next?.estimado ?? 0) - (next?.pagado ?? 0)));
    setColaboradorId(id);
    setMonto(restante ? String(restante) : '');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave({
        colaborador_id: colaboradorId,
        forma_pago: forma,
        monto: Number(monto),
        descripcion: nota || undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-5">
        <h2 className="font-serif text-2xl">Registrar pago</h2>
        <p className="mt-1 text-sm text-neutral-600">
          El efectivo sale de la caja general. Transferencia, depósito y tarjeta quedan registrados sin mover la caja.
        </p>
        <label className="mt-4 grid gap-1 text-sm">
          Colaborador
          <select className={inputClass} value={colaboradorId} onChange={(event) => elegir(Number(event.target.value))}>
            {personas.map((row) => (
              <option key={row.colaborador_id} value={row.colaborador_id}>
                {row.colaborador}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-neutral-600">
          Sueldo {pesos.format(fila?.estimado ?? 0)} · Pagado {pesos.format(fila?.pagado ?? 0)} · Falta {pesos.format(falta)}
        </p>
        <label className="mt-3 grid gap-1 text-sm">
          Forma de pago
          <select className={inputClass} value={forma} onChange={(event) => setForma(event.target.value as (typeof FORMAS)[number])}>
            {FORMAS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          Monto
          <input required type="number" min="0.01" step="0.01" className={inputClass} value={monto} onChange={(event) => setMonto(event.target.value)} />
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          Nota
          <input className={inputClass} value={nota} onChange={(event) => setNota(event.target.value)} />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button disabled={busy || !colaboradorId} className="h-9 bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReciboDialog({ fila, onClose, onSave }: { fila: Fila; onClose: () => void; onSave: (url: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallo, setFallo] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setFallo('');
    try {
      const url = await uploadArchivo(file);
      await onSave(url);
    } catch (reason) {
      setFallo(reason instanceof ApiError ? reason.message : 'No pudimos subir el archivo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-5">
        <h2 className="font-serif text-2xl">Recibo de {fila.colaborador}</h2>
        <p className="mt-1 text-sm text-neutral-600">PDF o foto del recibo firmado de esta semana.</p>
        {fila.recibo ? (
          <a className="mt-3 inline-block text-sm underline" href={fileHref(fila.recibo)} target="_blank" rel="noreferrer">
            Ver recibo cargado
          </a>
        ) : null}
        <input className="mt-4 block w-full text-sm" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {fallo ? <p className="mt-2 text-sm text-red-600">{fallo}</p> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="text-sm" onClick={onClose}>
            Cerrar
          </button>
          <button disabled={!file || busy} className="h-9 bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
