'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, ChevronDown, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ApiError, api } from '@/lib/api';
import { Notice } from '@/components/panel-shell';

type Usuario = { id: number; name: string };
type Tipo = {
  id: number;
  nombre: string;
  afecta_operacion: boolean;
  activo: boolean;
  usuario_ids: number[];
  corresponde: string;
};
type Cuenta = { id: number; banco: string; numero: string; clabe: string; activa: boolean };
type Lista<T> = { data: T[]; total: number; page: number; totalPages: number; es_admin: boolean; usuarios?: Usuario[] };
type Orden = { columna: string; direccion: 'asc' | 'desc' } | null;

const TAMANOS = [10, 25, 50, 100, 200];
const campo = 'h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-black';

function letras(valor: string, mayusculas = false) {
  const limpio = valor.replace(/[^\p{L}\p{M}\s]/gu, '');
  return mayusculas ? limpio.toLocaleUpperCase('es-MX') : limpio;
}

export function CatalogoMovimientos({ despachoId }: { despachoId?: number }) {
  const pathname = usePathname();
  const enDespacho = pathname.startsWith('/despacho');
  const lista = enDespacho ? '/despacho/movimientos' : '/panel/movimientos';
  const [tiposAbiertos, setTiposAbiertos] = useState(true);
  const [cuentasAbiertas, setCuentasAbiertas] = useState(false);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const [qTipo, setQTipo] = useState('');
  const [qCuenta, setQCuenta] = useState('');
  const [pageTipo, setPageTipo] = useState(1);
  const [pageCuenta, setPageCuenta] = useState(1);
  const [sizeTipo, setSizeTipo] = useState(50);
  const [sizeCuenta, setSizeCuenta] = useState(50);
  const [pagesTipo, setPagesTipo] = useState(1);
  const [pagesCuenta, setPagesCuenta] = useState(1);
  const [ordenTipo, setOrdenTipo] = useState<Orden>(null);
  const [ordenCuenta, setOrdenCuenta] = useState<Orden>(null);
  const [tipoForm, setTipoForm] = useState({ nombre: '', afecta: true, usuario_ids: [] as number[] });
  const [cuentaForm, setCuentaForm] = useState({ banco: '', numero: '', clabe: '' });
  const [editTipo, setEditTipo] = useState<Tipo | null>(null);
  const [editCuenta, setEditCuenta] = useState<Cuenta | null>(null);
  const [confirmar, setConfirmar] = useState<{ tipo: 'tipo' | 'cuenta'; id: number; activo: boolean; nombre: string } | null>(null);

  const base = despachoId ? `despacho_id=${despachoId}&` : '';

  async function cargar() {
    const [listaTipos, listaCuentas] = await Promise.all([
      api<Lista<Tipo>>(`/tipos-movimiento?${base}q=${encodeURIComponent(qTipo)}&page=${pageTipo}&pageSize=${sizeTipo}`, {}, true),
      api<Lista<Cuenta>>(`/cuentas-bancarias?${base}q=${encodeURIComponent(qCuenta)}&page=${pageCuenta}&pageSize=${sizeCuenta}`, {}, true),
    ]);
    setTipos(listaTipos.data);
    setPagesTipo(listaTipos.totalPages);
    setUsuarios(listaTipos.usuarios ?? []);
    setCuentas(listaCuentas.data);
    setPagesCuenta(listaCuentas.totalPages);
    setAdmin(listaTipos.es_admin);
    setError('');
  }

  useEffect(() => {
    let vivo = true;
    cargar().catch((reason) => {
      if (!vivo) return;
      setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los movimientos.');
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despachoId, qTipo, qCuenta, pageTipo, pageCuenta, sizeTipo, sizeCuenta]);

  async function guardarTipo(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/tipos-movimiento', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId, nombre: tipoForm.nombre, afecta_operacion: tipoForm.afecta, usuario_ids: tipoForm.usuario_ids }) }, true);
      setTipoForm({ nombre: '', afecta: true, usuario_ids: [] });
      await cargar();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el tipo.');
    }
  }

  async function guardarCuenta(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/cuentas-bancarias', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId, ...cuentaForm }) }, true);
      setCuentaForm({ banco: '', numero: '', clabe: '' });
      await cargar();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar la cuenta.');
    }
  }

  async function aplicarEstado() {
    if (!confirmar) return;
    setError('');
    const ruta = confirmar.tipo === 'tipo' ? `/tipos-movimiento/${confirmar.id}` : `/cuentas-bancarias/${confirmar.id}`;
    const cuerpo = confirmar.tipo === 'tipo' ? { despacho_id: despachoId, activo: !confirmar.activo } : { despacho_id: despachoId, activa: !confirmar.activo };
    try {
      await api(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }, true);
      setConfirmar(null);
      await cargar();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos actualizar el registro.');
    }
  }

  const tiposOrdenados = useMemo(() => ordenar(tipos, ordenTipo, { nombre: (fila) => fila.nombre, corresponde: (fila) => fila.corresponde, afecta: (fila) => (fila.afecta_operacion ? 'Sí' : 'No'), estado: (fila) => (fila.activo ? 'Activo' : 'Inhabilitado') }), [tipos, ordenTipo]);
  const cuentasOrdenadas = useMemo(() => ordenar(cuentas, ordenCuenta, { banco: (fila) => fila.banco, numero: (fila) => fila.numero, clabe: (fila) => fila.clabe, estado: (fila) => (fila.activa ? 'Activa' : 'Inactiva') }), [cuentas, ordenCuenta]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <p className="max-w-3xl text-neutral-500">
          Al registrar un movimiento se puede escribir un tipo nuevo. Aquí se inhabilita o se limita a quién aplica dentro del despacho. Las cuentas bancarias del despacho también están aquí.
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <Link href={lista} className="font-medium underline decoration-neutral-300 underline-offset-2">Lista de movimientos</Link>
          <Link href={`${lista}/caja`} className="font-medium underline decoration-neutral-300 underline-offset-2">Caja del día</Link>
        </div>
      </header>
      <Notice error={error} />
      <Seccion titulo="Tipos de movimiento" abierto={tiposAbiertos} onToggle={() => setTiposAbiertos((valor) => !valor)}>
        <p className="mb-4 max-w-3xl text-sm text-neutral-500">Si no marcas a nadie, el tipo queda sin limitar y aparece para cualquier persona del despacho. Si marcas a alguien, solo esa persona puede usarlo.</p>
        <Buscador valor={qTipo} placeholder="Buscar tipo de movimiento..." onChange={(valor) => { setQTipo(valor); setPageTipo(1); }} tamano={sizeTipo} onTamano={(valor) => { setSizeTipo(valor); setPageTipo(1); }} />
        <Tabla
          columnas={[
            ['nombre', 'Nombre'],
            ['corresponde', 'Corresponde a'],
            ['afecta', 'Afecta operación'],
            ['estado', 'Estado'],
          ]}
          orden={ordenTipo}
          onSort={(columna) => setOrdenTipo((actual) => siguiente(actual, columna))}
          vacio="Todavía no hay tipos de movimiento."
          filas={tiposOrdenados.map((tipo) => (
            <tr key={tipo.id} className="border-b border-neutral-100">
              <td className={`p-4 ${tipo.activo ? '' : 'text-neutral-400'}`}>{tipo.nombre}</td>
              <td className="p-4">{tipo.corresponde}</td>
              <td className="p-4">{tipo.afecta_operacion ? 'Sí' : 'No'}</td>
              <td className="p-4">{tipo.activo ? 'Activo' : 'Inhabilitado'}</td>
              <td className="p-4">
                {admin ? (
                  <span className="flex items-center gap-3">
                    <button type="button" aria-label="Editar" onClick={() => setEditTipo(tipo)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={tipo.activo ? 'Inhabilitar' : 'Habilitar'} onClick={() => setConfirmar({ tipo: 'tipo', id: tipo.id, activo: tipo.activo, nombre: tipo.nombre })}>
                      {tipo.activo ? <Ban className="h-4 w-4 text-red-600" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        />
        <Pie pagina={pageTipo} total={pagesTipo} onChange={setPageTipo} />
        {admin ? (
          <form onSubmit={guardarTipo} className="mt-8 max-w-5xl space-y-6 border border-neutral-200 p-6 shadow-md">
            <h3 className="text-xl font-semibold">Nuevo tipo de movimiento</h3>
            <label className="block space-y-1 text-sm">
              <span>Nombre</span>
              <input required className={campo} placeholder="Ej. Ingreso" value={tipoForm.nombre} onChange={(event) => setTipoForm({ ...tipoForm, nombre: letras(event.target.value, true) })} />
            </label>
            <Casilla marcado={tipoForm.afecta} onChange={(afecta) => setTipoForm({ ...tipoForm, afecta })} titulo="Afecta la operación" texto="Si está marcado, los movimientos de este tipo suman o restan en los totales de caja general. Si no, solo se registran." />
            <Personas usuarios={usuarios} ids={tipoForm.usuario_ids} onChange={(usuario_ids) => setTipoForm({ ...tipoForm, usuario_ids })} />
            <button className="inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white"><Save className="mr-2 h-4 w-4" />Guardar</button>
          </form>
        ) : null}
      </Seccion>
      <Seccion titulo="Cuentas bancarias" abierto={cuentasAbiertas} onToggle={() => setCuentasAbiertas((valor) => !valor)}>
        <Buscador valor={qCuenta} placeholder="Buscar por banco o número de cuenta..." onChange={(valor) => { setQCuenta(valor); setPageCuenta(1); }} tamano={sizeCuenta} onTamano={(valor) => { setSizeCuenta(valor); setPageCuenta(1); }} />
        <Tabla
          columnas={[['banco', 'Banco'], ['numero', 'Número de cuenta'], ['clabe', 'CLABE'], ['estado', 'Estado']]}
          orden={ordenCuenta}
          onSort={(columna) => setOrdenCuenta((actual) => siguiente(actual, columna))}
          vacio="Todavía no hay cuentas bancarias."
          filas={cuentasOrdenadas.map((cuenta) => (
            <tr key={cuenta.id} className="border-b border-neutral-100">
              <td className="p-4">{cuenta.banco}</td>
              <td className="p-4">{cuenta.numero}</td>
              <td className="p-4">{cuenta.clabe}</td>
              <td className="p-4">{cuenta.activa ? 'Activa' : 'Inactiva'}</td>
              <td className="p-4">
                {admin ? (
                  <span className="flex items-center gap-3">
                    <button type="button" aria-label="Editar" onClick={() => setEditCuenta(cuenta)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={cuenta.activa ? 'Inhabilitar' : 'Habilitar'} onClick={() => setConfirmar({ tipo: 'cuenta', id: cuenta.id, activo: cuenta.activa, nombre: cuenta.banco })}>
                      {cuenta.activa ? <Trash2 className="h-4 w-4 text-red-600" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        />
        <Pie pagina={pageCuenta} total={pagesCuenta} onChange={setPageCuenta} />
        {admin ? (
          <form onSubmit={guardarCuenta} className="mt-8 max-w-5xl border border-neutral-200 p-6 shadow-md">
            <h3 className="text-xl font-semibold">Nueva cuenta bancaria</h3>
            <div className="mt-4 rounded-md border border-neutral-200 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Nombre del banco</span>
                  <input required className={campo} placeholder="BBVA Santander etc" value={cuentaForm.banco} onChange={(event) => setCuentaForm({ ...cuentaForm, banco: letras(event.target.value) })} />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Número de cuenta</span>
                  <input required className={campo} placeholder="Número de cuenta..." value={cuentaForm.numero} onChange={(event) => setCuentaForm({ ...cuentaForm, numero: event.target.value.replace(/\D/g, '').slice(0, 20) })} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span>CLABE interbancaria</span>
                  <input required className={campo} placeholder="18 dígitos..." value={cuentaForm.clabe} onChange={(event) => setCuentaForm({ ...cuentaForm, clabe: event.target.value.replace(/\D/g, '').slice(0, 18) })} />
                </label>
              </div>
              <button className="mt-4 inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white"><Save className="mr-2 h-4 w-4" />Guardar</button>
            </div>
          </form>
        ) : null}
      </Seccion>
      {editTipo ? (
        <Dialogo titulo="Editar tipo de movimiento" onClose={() => setEditTipo(null)}>
          <EditorTipo tipo={editTipo} usuarios={usuarios} despachoId={despachoId} onClose={() => setEditTipo(null)} onSaved={cargar} onError={setError} />
        </Dialogo>
      ) : null}
      {editCuenta ? (
        <Dialogo titulo="Editar cuenta bancaria" onClose={() => setEditCuenta(null)}>
          <EditorCuenta cuenta={editCuenta} despachoId={despachoId} onClose={() => setEditCuenta(null)} onSaved={cargar} onError={setError} />
        </Dialogo>
      ) : null}
      {confirmar ? (
        <Dialogo titulo={confirmar.activo ? '¿Inhabilitar este registro?' : '¿Habilitar este registro?'} onClose={() => setConfirmar(null)}>
          <p className="text-sm text-neutral-600">
            {confirmar.activo ? `${confirmar.nombre} dejará de ofrecerse al registrar movimientos.` : `${confirmar.nombre} vuelve a estar disponible.`}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="h-9 border border-neutral-300 px-4 text-sm" onClick={() => setConfirmar(null)}>Cancelar</button>
            <button type="button" className="h-9 bg-black px-4 text-sm font-medium text-white" onClick={aplicarEstado}>{confirmar.activo ? 'Inhabilitar' : 'Habilitar'}</button>
          </div>
        </Dialogo>
      ) : null}
    </div>
  );
}

function EditorTipo({ tipo, usuarios, despachoId, onClose, onSaved, onError }: { tipo: Tipo; usuarios: Usuario[]; despachoId?: number; onClose: () => void; onSaved: () => Promise<void>; onError: (mensaje: string) => void }) {
  const [form, setForm] = useState({ nombre: tipo.nombre, afecta: tipo.afecta_operacion, usuario_ids: tipo.usuario_ids });
  async function guardar(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/tipos-movimiento/${tipo.id}`, { method: 'PATCH', body: JSON.stringify({ despacho_id: despachoId, nombre: form.nombre, afecta_operacion: form.afecta, usuario_ids: form.usuario_ids }) }, true);
      await onSaved();
      onClose();
    } catch (reason) {
      onError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el tipo.');
    }
  }
  return (
    <form onSubmit={guardar} className="space-y-4">
      <label className="block space-y-1 text-sm"><span>Nombre</span><input required className={campo} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: letras(event.target.value, true) })} /></label>
      <Casilla marcado={form.afecta} onChange={(afecta) => setForm({ ...form, afecta })} titulo="Afecta la operación" texto="Si está marcado, los movimientos de este tipo suman o restan en los totales de caja general. Si no, solo se registran." />
      <Personas usuarios={usuarios} ids={form.usuario_ids} onChange={(usuario_ids) => setForm({ ...form, usuario_ids })} />
      <button className="inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white"><Save className="mr-2 h-4 w-4" />Guardar</button>
    </form>
  );
}

function EditorCuenta({ cuenta, despachoId, onClose, onSaved, onError }: { cuenta: Cuenta; despachoId?: number; onClose: () => void; onSaved: () => Promise<void>; onError: (mensaje: string) => void }) {
  const [form, setForm] = useState({ banco: cuenta.banco, numero: cuenta.numero, clabe: cuenta.clabe });
  async function guardar(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/cuentas-bancarias/${cuenta.id}`, { method: 'PATCH', body: JSON.stringify({ despacho_id: despachoId, ...form }) }, true);
      await onSaved();
      onClose();
    } catch (reason) {
      onError(reason instanceof ApiError ? reason.message : 'No pudimos guardar la cuenta.');
    }
  }
  return (
    <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm"><span>Nombre del banco</span><input required className={campo} value={form.banco} onChange={(event) => setForm({ ...form, banco: letras(event.target.value) })} /></label>
      <label className="space-y-1 text-sm"><span>Número de cuenta</span><input required className={campo} value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value.replace(/\D/g, '').slice(0, 20) })} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span>CLABE interbancaria</span><input required className={campo} value={form.clabe} onChange={(event) => setForm({ ...form, clabe: event.target.value.replace(/\D/g, '').slice(0, 18) })} /></label>
      <button className="inline-flex h-10 w-fit items-center bg-black px-4 text-sm font-medium text-white"><Save className="mr-2 h-4 w-4" />Guardar</button>
    </form>
  );
}

function Personas({ usuarios, ids, onChange }: { usuarios: Usuario[]; ids: number[]; onChange: (ids: number[]) => void }) {
  const marcados = new Set(ids);
  function alternar(id: number) {
    onChange(marcados.has(id) ? ids.filter((actual) => actual !== id) : [...ids, id]);
  }
  return (
    <div className="space-y-3 rounded-md border border-neutral-200 p-4">
      <div>
        <p className="text-sm font-medium">A quién corresponde</p>
        <p className="text-sm text-neutral-500">Al registrar un movimiento, este tipo solo aparece para las personas del despacho que marques.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="h-8 border border-neutral-300 px-3 text-sm" onClick={() => onChange(usuarios.map((persona) => persona.id))}>Marcar todos</button>
        <button type="button" className="h-8 border border-neutral-300 px-3 text-sm" onClick={() => onChange([])}>Quitar todos</button>
      </div>
      <p className="text-sm font-medium">Personas del despacho</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {usuarios.map((persona) => (
          <label key={persona.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-black" checked={marcados.has(persona.id)} onChange={() => alternar(persona.id)} />
            {persona.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function Casilla({ marcado, onChange, titulo, texto }: { marcado: boolean; onChange: (valor: boolean) => void; titulo: string; texto: string }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-4 text-sm">
      <input type="checkbox" className="mt-1 size-4 accent-black" checked={marcado} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="text-neutral-500">{texto}</span>
      </span>
    </label>
  );
}

function Seccion({ titulo, abierto, onToggle, children }: { titulo: string; abierto: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="mb-4 border border-neutral-200">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold" onClick={onToggle}>
        {titulo}
        <ChevronDown className={`h-4 w-4 transition ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto ? <div className="border-t border-neutral-200 px-4 py-4">{children}</div> : null}
    </section>
  );
}

function Buscador({ valor, placeholder, onChange, tamano, onTamano }: { valor: string; placeholder: string; onChange: (valor: string) => void; tamano: number; onTamano: (valor: number) => void }) {
  return (
    <div className="mb-3 space-y-3">
      <input className={campo} placeholder={placeholder} value={valor} onChange={(event) => onChange(event.target.value)} />
      <label className="flex w-fit items-center gap-2 whitespace-nowrap text-sm text-neutral-500">
        Por página
        <select className={`${campo} w-20`} value={tamano} onChange={(event) => onTamano(Number(event.target.value))}>
          {TAMANOS.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
      </label>
    </div>
  );
}

function Tabla({ columnas, orden, onSort, filas, vacio }: { columnas: Array<[string, string]>; orden: Orden; onSort: (columna: string) => void; filas: ReactNode[]; vacio: string }) {
  return (
    <div className="overflow-x-auto shadow-lg">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-neutral-900 text-white">
          <tr>
            {columnas.map(([clave, titulo]) => {
              const activo = orden?.columna === clave;
              const Icono = activo && orden.direccion === 'asc' ? ArrowUp : activo && orden.direccion === 'desc' ? ArrowDown : ArrowUpDown;
              return (
                <th key={clave} className="h-12 px-4 text-left font-semibold">
                  <button type="button" className="inline-flex items-center gap-1.5 font-semibold" onClick={() => onSort(clave)}>{titulo}<Icono className="h-3.5 w-3.5 opacity-70" /></button>
                </th>
              );
            })}
            <th className="h-12 px-4 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas}
          {filas.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={columnas.length + 1}>{vacio}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function Pie({ pagina, total, onChange }: { pagina: number; total: number; onChange: (pagina: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      <button type="button" className="h-8 border border-neutral-300 px-2 disabled:opacity-40" disabled={pagina <= 1} onClick={() => onChange(1)}>«</button>
      <button type="button" className="h-8 border border-neutral-300 px-2 disabled:opacity-40" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>‹</button>
      <span className="inline-flex h-8 min-w-8 items-center justify-center border border-neutral-300 px-2">{pagina}</span>
      <button type="button" className="h-8 border border-neutral-300 px-2 disabled:opacity-40" disabled={pagina >= total} onClick={() => onChange(pagina + 1)}>›</button>
      <button type="button" className="h-8 border border-neutral-300 px-2 disabled:opacity-40" disabled={pagina >= total} onClick={() => onChange(total)}>»</button>
      <span className="text-neutral-500">Página {pagina} de {total}</span>
    </div>
  );
}

function Dialogo({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <article className="max-h-[85vh] w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-lg" onClick={(event) => event.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" className="text-sm font-semibold" onClick={onClose}>Cerrar</button>
        </header>
        {children}
      </article>
    </div>
  );
}

function siguiente(actual: Orden, columna: string): Orden {
  if (!actual || actual.columna !== columna) return { columna, direccion: 'asc' };
  if (actual.direccion === 'asc') return { columna, direccion: 'desc' };
  return null;
}

function ordenar<T>(filas: T[], orden: Orden, lectores: Record<string, (fila: T) => string>) {
  if (!orden || !lectores[orden.columna]) return filas;
  const leer = lectores[orden.columna];
  return [...filas].sort((a, b) => {
    const cmp = leer(a).localeCompare(leer(b), 'es', { numeric: true, sensitivity: 'base' });
    return orden.direccion === 'asc' ? cmp : -cmp;
  });
}
