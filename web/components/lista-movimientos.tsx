'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import { Notice } from '@/components/panel-shell';

type Persona = { id: number; name: string };
type Tipo = { id: number; nombre: string; afecta_operacion: boolean; usuario_ids: number[] };
type Cuenta = { id: number; banco: string; numero: string };
type Fila = {
  id: number;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  tipo_movimiento: string;
  corresponde: string;
  forma_pago: string;
  monto: number;
  estado: string;
  usuario: string;
  descripcion: string;
};
type Lista = {
  data: Fila[];
  total: number;
  page: number;
  totalPages: number;
  total_operacion: number;
  total_fuera: number;
  suma_ingresos: number;
  suma_egresos: number;
  es_admin: boolean;
  personas: Persona[];
  tipos: Tipo[];
  cuentas: Cuenta[];
};
type Orden = { columna: string; direccion: 'asc' | 'desc' } | null;

const TAMANOS = [10, 25, 50, 100, 200];
const campo = 'h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-black';
const vacio = { usuario_id: '', tipo: 'egreso', tipo_movimiento_id: '', tipo_nombre: '', forma_pago: 'efectivo', cuenta_bancaria_id: '', monto: '', descripcion: '' };

export function ListaMovimientos({ despachoId }: { despachoId?: number }) {
  const pathname = usePathname();
  const enDespacho = pathname.startsWith('/despacho');
  const catalogo = enDespacho ? '/despacho/catalogos/movimientos' : '/panel/catalogos/movimientos';
  const inicios = enDespacho ? '/despacho/movimientos/inicios' : '/panel/movimientos/inicios';
  const cortes = enDespacho ? '/despacho/movimientos/cortes' : '/panel/movimientos/cortes';
  const [lista, setLista] = useState<Lista | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [qAplicada, setQAplicada] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [ambito, setAmbito] = useState<'operacion' | 'fuera'>('operacion');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [desdeOk, setDesdeOk] = useState('');
  const [hastaOk, setHastaOk] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [orden, setOrden] = useState<Orden>(null);
  const [form, setForm] = useState(vacio);
  const [baja, setBaja] = useState<Fila | null>(null);
  const [motivo, setMotivo] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setQAplicada(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const consulta = useMemo(() => {
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', String(despachoId));
    if (qAplicada.trim()) params.set('q', qAplicada.trim());
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (ambito === 'fuera') params.set('ambito', 'fuera');
    if (desdeOk) params.set('desde', desdeOk);
    if (hastaOk) params.set('hasta', hastaOk);
    if (tipo) params.set('tipo', tipo);
    if (tipoId) params.set('tipo_id', tipoId);
    if (usuarioId) params.set('usuario_id', usuarioId);
    return params.toString();
  }, [despachoId, qAplicada, page, pageSize, ambito, desdeOk, hastaOk, tipo, tipoId, usuarioId]);

  useEffect(() => {
    let vivo = true;
    api<Lista>(`/registros-movimiento?${consulta}`, {}, true)
      .then((data) => {
        if (!vivo) return;
        setLista(data);
        setError('');
      })
      .catch((reason) => {
        if (!vivo) return;
        setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los movimientos.');
      });
    return () => {
      vivo = false;
    };
  }, [consulta, recarga]);

  const tiposPersona = (lista?.tipos ?? []).filter((tipoFila) => {
    const id = Number(form.usuario_id);
    return !tipoFila.usuario_ids.length || tipoFila.usuario_ids.includes(id);
  });
  const tipoElegido = tiposPersona.find((tipoFila) => String(tipoFila.id) === form.tipo_movimiento_id);
  const filas = useMemo(() => ordenar(lista?.data ?? [], orden), [lista, orden]);
  const admin = lista?.es_admin ?? false;

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setError('');
    const cuerpo: Record<string, unknown> = {
      despacho_id: despachoId,
      usuario_id: Number(form.usuario_id),
      tipo: form.tipo,
      forma_pago: form.forma_pago,
      monto: Number(form.monto),
      descripcion: form.descripcion,
    };
    if (form.tipo_movimiento_id === 'nuevo') cuerpo.tipo_nombre = form.tipo_nombre;
    else cuerpo.tipo_movimiento_id = Number(form.tipo_movimiento_id);
    if (form.forma_pago !== 'efectivo') cuerpo.cuenta_bancaria_id = Number(form.cuenta_bancaria_id);
    try {
      await api('/registros-movimiento', { method: 'POST', body: JSON.stringify(cuerpo) }, true);
      const afecta = form.tipo_movimiento_id === 'nuevo' || tipoElegido?.afecta_operacion !== false;
      setForm(vacio);
      setPage(1);
      setAmbito(afecta ? 'operacion' : 'fuera');
      setRecarga((valor) => valor + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar el movimiento.');
    }
  }

  async function eliminar(event: FormEvent) {
    event.preventDefault();
    if (!baja) return;
    setError('');
    try {
      await api(`/registros-movimiento/${baja.id}`, { method: 'DELETE', body: JSON.stringify({ despacho_id: despachoId, motivo }) }, true);
      setBaja(null);
      setMotivo('');
      setRecarga((valor) => valor + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos eliminar el movimiento.');
    }
  }

  function limpiar() {
    setQ('');
    setQAplicada('');
    setDesde('');
    setHasta('');
    setDesdeOk('');
    setHastaOk('');
    setTipo('');
    setTipoId('');
    setUsuarioId('');
    setPage(1);
  }

  function aplicarFechas() {
    if (!desde || !hasta) return;
    const [inicio, fin] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    setDesde(inicio);
    setHasta(fin);
    setDesdeOk(inicio);
    setHastaOk(fin);
    setPage(1);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Movimientos</h1>
        <p className="mt-2 text-neutral-500">Ingresos y egresos del despacho, de operación y fuera de operación.</p>
      </header>
      <div className="mb-6 flex gap-4 text-sm">
        <Link href={catalogo} className="font-medium underline decoration-neutral-300 underline-offset-2">Catálogo de tipos</Link>
        <Link href={inicios} className="font-medium underline decoration-neutral-300 underline-offset-2">Inicios de caja</Link>
        <Link href={cortes} className="font-medium underline decoration-neutral-300 underline-offset-2">Cortes del día</Link>
      </div>
      <Notice error={error} />
      {admin ? (
        <form onSubmit={guardar} className="mb-10 max-w-5xl border border-neutral-200 p-6 shadow-md">
          <h2 className="text-2xl font-bold">Registrar nuevo movimiento</h2>
          <div className="mt-6 space-y-4">
            <label className="block space-y-1 text-sm">
              <span>A quién corresponde *</span>
              <select required className={campo} value={form.usuario_id} onChange={(event) => setForm({ ...form, usuario_id: event.target.value, tipo_movimiento_id: '', tipo_nombre: '' })}>
                <option value="">Selecciona a la persona</option>
                {(lista?.personas ?? []).map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
              </select>
              <span className="block text-neutral-500">Los tipos se filtran por esa persona. Si el tipo no existe, escríbelo y queda limitado a quien elegiste.</span>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Tipo de transacción</span>
              <select required className={campo} value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Tipo de movimiento</span>
              <select required className={campo} disabled={!form.usuario_id} value={form.tipo_movimiento_id} onChange={(event) => setForm({ ...form, tipo_movimiento_id: event.target.value, tipo_nombre: '' })}>
                <option value="">{form.usuario_id ? 'Selecciona el tipo' : 'Primero elige a quién corresponde'}</option>
                {form.usuario_id ? tiposPersona.map((tipoFila) => <option key={tipoFila.id} value={tipoFila.id}>{tipoFila.nombre}</option>) : null}
                {form.usuario_id ? <option value="nuevo">Registrar uno nuevo</option> : null}
              </select>
              {form.tipo_movimiento_id === 'nuevo' ? (
                <input required className={`${campo} mt-2`} placeholder="Nombre del tipo" value={form.tipo_nombre} onChange={(event) => setForm({ ...form, tipo_nombre: event.target.value.replace(/[^\p{L}\p{M}\s]/gu, '').toLocaleUpperCase('es-MX') })} />
              ) : null}
              <span className="block text-neutral-500">
                {tipoElegido ? (tipoElegido.afecta_operacion ? 'Este tipo suma o resta en la caja general.' : 'Este tipo solo se registra y no mueve la caja general.') : 'Escribe un tipo nuevo si no está en la lista.'}
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Forma de pago</span>
              <select className={campo} value={form.forma_pago} onChange={(event) => setForm({ ...form, forma_pago: event.target.value, cuenta_bancaria_id: '' })}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Depósito</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </label>
            {form.forma_pago !== 'efectivo' ? (
              <label className="block space-y-1 text-sm">
                <span>Cuenta bancaria</span>
                <select required className={campo} value={form.cuenta_bancaria_id} onChange={(event) => setForm({ ...form, cuenta_bancaria_id: event.target.value })}>
                  <option value="">Selecciona la cuenta</option>
                  {(lista?.cuentas ?? []).map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.banco} · {cuenta.numero}</option>)}
                </select>
              </label>
            ) : null}
            <label className="block space-y-1 text-sm">
              <span>Monto</span>
              <input required className={campo} inputMode="decimal" placeholder="0.00" value={form.monto} onChange={(event) => setForm({ ...form, monto: event.target.value.replace(/[^\d.]/g, '') })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Descripción</span>
              <textarea required minLength={3} className="min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black" placeholder="Describe el motivo del movimiento..." value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
            </label>
            <button className="inline-flex h-10 items-center bg-black hover:bg-neutral-800 px-4 text-sm font-medium text-white"><Save className="mr-2 h-4 w-4" />Guardar</button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 flex w-fit gap-1 rounded-md bg-neutral-100 p-1">
        <Tab activo={ambito === 'operacion'} onClick={() => { setAmbito('operacion'); setPage(1); }}>Operación ({lista?.total_operacion ?? 0})</Tab>
        <Tab activo={ambito === 'fuera'} onClick={() => { setAmbito('fuera'); setPage(1); }}>Fuera de operación ({lista?.total_fuera ?? 0})</Tab>
      </div>
      <div className="mb-4 space-y-3">
        <input className={campo} placeholder="Buscar por ID, descripción, forma de pago, tipo..." value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-neutral-500">Desde<input type="date" className={campo} value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
          <label className="space-y-1 text-xs text-neutral-500">Hasta<input type="date" className={campo} value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
          <button type="button" className="h-9 bg-black hover:bg-neutral-800 px-3 text-sm text-white disabled:opacity-40" disabled={!desde || !hasta || (desde === desdeOk && hasta === hastaOk)} onClick={aplicarFechas}>Aplicar fechas</button>
          <select className="h-9 rounded-md border border-neutral-300 px-2 text-sm" value={tipo} onChange={(event) => { setTipo(event.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
          <select className="h-9 rounded-md border border-neutral-300 px-2 text-sm" value={tipoId} onChange={(event) => { setTipoId(event.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            {(lista?.tipos ?? []).map((tipoFila) => <option key={tipoFila.id} value={tipoFila.id}>{tipoFila.nombre}</option>)}
          </select>
          <select className="h-9 max-w-xs rounded-md border border-neutral-300 px-2 text-sm" value={usuarioId} onChange={(event) => { setUsuarioId(event.target.value); setPage(1); }}>
            <option value="">Todas las personas</option>
            {(lista?.personas ?? []).map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
          </select>
          <button type="button" className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm" onClick={limpiar}><X className="mr-1 h-4 w-4" />Limpiar</button>
          <label className="ml-auto flex items-center gap-2 text-sm text-neutral-500">Por página
            <select className="h-9 rounded-md border border-neutral-300 px-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {TAMANOS.map((tamano) => <option key={tamano} value={tamano}>{tamano}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-4 rounded-md border border-neutral-200 px-4 py-3 sm:grid-cols-3">
          <Total etiqueta="Ingresos (periodo)" monto={lista?.suma_ingresos ?? 0} />
          <Total etiqueta="Egresos (periodo)" monto={lista?.suma_egresos ?? 0} />
          <Total etiqueta="Neto (periodo)" monto={(lista?.suma_ingresos ?? 0) - (lista?.suma_egresos ?? 0)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <Th etiqueta="ID" columna="id" orden={orden} onSort={setOrden} />
              <Th etiqueta="Fecha" columna="fecha" orden={orden} onSort={setOrden} />
              <Th etiqueta="Tipo" columna="tipo" orden={orden} onSort={setOrden} />
              <Th etiqueta="Tipo de movimiento" columna="tipo_movimiento" orden={orden} onSort={setOrden} />
              <Th etiqueta="Corresponde a" columna="corresponde" orden={orden} onSort={setOrden} />
              <Th etiqueta="Forma de pago" columna="forma_pago" orden={orden} onSort={setOrden} />
              <Th etiqueta="Monto" columna="monto" orden={orden} onSort={setOrden} />
              <Th etiqueta="Estado" columna="estado" orden={orden} onSort={setOrden} />
              <Th etiqueta="Usuario" columna="usuario" orden={orden} onSort={setOrden} />
              <Th etiqueta="Descripción" columna="descripcion" orden={orden} onSort={setOrden} />
              <th className="whitespace-nowrap px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-neutral-500">No hay movimientos registrados.</td></tr>
            ) : filas.map((fila) => (
              <tr key={fila.id} className="border-b border-neutral-200">
                <td className="px-3 py-2">{fila.id}</td>
                <td className="whitespace-nowrap px-3 py-2">{fechaLista(fila.fecha)}</td>
                <td className="px-3 py-2">{fila.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
                <td className="px-3 py-2">{fila.tipo_movimiento}</td>
                <td className="px-3 py-2">{fila.corresponde}</td>
                <td className="px-3 py-2">{fila.forma_pago}</td>
                <td className="whitespace-nowrap px-3 py-2">{dinero(fila.monto)}</td>
                <td className="px-3 py-2">{fila.estado}</td>
                <td className="px-3 py-2">{fila.usuario}</td>
                <td className="max-w-xs px-3 py-2">{fila.descripcion}</td>
                <td className="px-3 py-2">
                  {admin ? <button type="button" aria-label="Eliminar" onClick={() => { setBaja(fila); setMotivo(''); }}><Trash2 className="h-4 w-4 text-red-600" /></button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <button type="button" className="h-8 w-8 border border-neutral-300" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
        <button type="button" className="h-8 w-8 border border-neutral-300" disabled={page <= 1} onClick={() => setPage((valor) => valor - 1)}>‹</button>
        <span className="inline-flex h-8 min-w-8 items-center justify-center border border-neutral-900 px-2">{page}</span>
        <button type="button" className="h-8 w-8 border border-neutral-300" disabled={page >= (lista?.totalPages ?? 1)} onClick={() => setPage((valor) => valor + 1)}>›</button>
        <button type="button" className="h-8 w-8 border border-neutral-300" disabled={page >= (lista?.totalPages ?? 1)} onClick={() => setPage(lista?.totalPages ?? 1)}>»</button>
        <span className="text-neutral-500">Página {page} de {lista?.totalPages ?? 1}</span>
      </div>
      {baja ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={eliminar} className="w-full max-w-md bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold">Eliminar movimiento {baja.id}</h3>
            <p className="mt-1 text-sm text-neutral-500">{baja.tipo_movimiento} · {dinero(baja.monto)}. Si afectó la caja general, el saldo vuelve atrás.</p>
            <label className="mt-4 block space-y-1 text-sm">
              <span>Motivo</span>
              <textarea required minLength={3} className="min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 border border-neutral-300 px-3 text-sm" onClick={() => setBaja(null)}>Cancelar</button>
              <button className="h-9 bg-black hover:bg-neutral-800 px-3 text-sm text-white">Eliminar</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Tab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`rounded px-3 py-1.5 text-sm ${activo ? 'bg-white font-medium shadow' : 'text-neutral-600'}`} onClick={onClick}>{children}</button>;
}

function Total({ etiqueta, monto }: { etiqueta: string; monto: number }) {
  return <div><p className="text-xs text-neutral-500">{etiqueta}</p><p className="text-lg font-semibold">{dinero(monto)}</p></div>;
}

function Th({ etiqueta, columna, orden, onSort }: { etiqueta: string; columna: string; orden: Orden; onSort: (orden: Orden) => void }) {
  const activo = orden?.columna === columna;
  const Icono = !activo ? ArrowUpDown : orden.direccion === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="whitespace-nowrap px-3 py-2 font-medium">
      <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(activo && orden.direccion === 'asc' ? { columna, direccion: 'desc' } : { columna, direccion: 'asc' })}>
        {etiqueta}<Icono className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function ordenar(filas: Fila[], orden: Orden) {
  if (!orden) return filas;
  const valor = (fila: Fila) => {
    if (orden.columna === 'monto' || orden.columna === 'id') return fila[orden.columna];
    if (orden.columna === 'fecha') return new Date(fila.fecha).getTime();
    if (orden.columna === 'tipo') return fila.tipo;
    return String(fila[orden.columna as keyof Fila] ?? '');
  };
  return [...filas].sort((a, b) => {
    const uno = valor(a);
    const dos = valor(b);
    const comparado = typeof uno === 'number' && typeof dos === 'number' ? uno - dos : String(uno).localeCompare(String(dos), 'es');
    return orden.direccion === 'asc' ? comparado : -comparado;
  });
}

function dinero(monto: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
}

function fechaLista(iso: string) {
  const fecha = new Date(iso);
  const dia = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha);
  const hora = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).format(fecha);
  return `${dia}, ${hora}`;
}
