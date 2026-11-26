'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Save, Search, Trash2, X } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Fila = {
  id: number;
  tipo: 'fisica' | 'moral';
  nombre: string;
  paterno: string | null;
  materno: string | null;
  nombre_completo: string;
  rfc: string | null;
  domicilio: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  fecha_nacimiento: string | null;
  genero: 'Masculino' | 'Femenino' | 'Otro' | null;
  zona_residencia: string | null;
  fecha_registro: string;
  autor: string | null;
  expedientes: number;
  movimientos: number;
};

type Lista = {
  data: Fila[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Forma = {
  tipo: 'fisica' | 'moral';
  nombre: string;
  paterno: string;
  materno: string;
  fecha_nacimiento: string;
  genero: '' | 'Masculino' | 'Femenino' | 'Otro';
  domicilio: string;
  telefono: string;
  correo: string;
  rfc: string;
  zona_residencia: string;
  notas: string;
};

type Orden = { columna: string; direccion: 'asc' | 'desc' } | null;
type Despacho = { id: number; name: string; is_active?: boolean };

const TAMANOS = [10, 25, 50, 100, 200];
const vacio: Forma = {
  tipo: 'fisica',
  nombre: '',
  paterno: '',
  materno: '',
  fecha_nacimiento: '',
  genero: '',
  domicilio: '',
  telefono: '',
  correo: '',
  rfc: '',
  zona_residencia: '',
  notas: '',
};

export function ClientesDesk({ elegirDespacho = false }: { elegirDespacho?: boolean }) {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [despachoId, setDespachoId] = useState('');
  const [lista, setLista] = useState<Lista | null>(null);
  const [q, setQ] = useState('');
  const [qOk, setQOk] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [orden, setOrden] = useState<Orden>(null);
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState<Forma>(vacio);
  const [edit, setEdit] = useState<Fila | null>(null);
  const [editForm, setEditForm] = useState<Forma>(vacio);
  const [baja, setBaja] = useState<Fila | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [puedeCrear, setPuedeCrear] = useState(true);
  const [puedeEditar, setPuedeEditar] = useState(true);
  const [puedeBorrar, setPuedeBorrar] = useState(true);
  const listo = !elegirDespacho || Boolean(despachoId);

  useEffect(() => {
    setPuedeCrear(!esPersonalSoloLectura('clientes', 'insertar'));
    setPuedeEditar(!esPersonalSoloLectura('clientes', 'actualizar'));
    setPuedeBorrar(!esPersonalSoloLectura('clientes', 'eliminar'));
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
    const texto = q.trim();
    const timer = setTimeout(() => {
      setQOk((actual) => {
        if (actual !== texto) setPage(1);
        return texto;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!listo) return;
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', despachoId);
    if (qOk) params.set('q', qOk);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    let vivo = true;
    api<Lista>(`/clientes?${params.toString()}`, {}, true)
      .then((data) => {
        if (!vivo) return;
        setLista(data);
        setAviso('');
        if (page > data.totalPages) setPage(data.totalPages);
      })
      .catch((reason) => {
        if (vivo) setAviso(reason instanceof ApiError ? reason.message : 'No pudimos cargar los clientes.');
      });
    return () => {
      vivo = false;
    };
  }, [despachoId, qOk, page, pageSize, recarga, listo]);

  function cuerpo(valor: Forma) {
    const moral = valor.tipo === 'moral';
    const telefono = valor.telefono.replace(/\D/g, '');
    return {
      despacho_id: despachoId ? Number(despachoId) : undefined,
      tipo: valor.tipo,
      nombre: valor.nombre.trim(),
      paterno: moral ? null : valor.paterno.trim(),
      materno: moral ? null : valor.materno.trim() || null,
      fecha_nacimiento: moral ? null : valor.fecha_nacimiento || null,
      genero: moral || !valor.genero ? null : valor.genero,
      domicilio: valor.domicilio.trim() || null,
      telefono: telefono || null,
      correo: valor.correo.trim() || null,
      rfc: valor.rfc.trim() || null,
      zona_residencia: valor.zona_residencia.trim() || null,
      notas: valor.notas.trim() || null,
    };
  }

  function validar(valor: Forma) {
    if (valor.nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (valor.tipo === 'fisica' && !valor.paterno.trim()) return 'El apellido paterno es obligatorio.';
    const telefono = valor.telefono.replace(/\D/g, '');
    if (telefono && telefono.length !== 10) return 'El teléfono debe tener 10 dígitos.';
    if (valor.fecha_nacimiento && valor.fecha_nacimiento > hoy()) return 'La fecha de nacimiento no puede ser futura.';
    return '';
  }

  async function guardar(event: FormEvent, valor: Forma, id?: number) {
    event.preventDefault();
    if (ocupado) return;
    const mensaje = validar(valor);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setOcupado(true);
    setError('');
    try {
      if (id) await api(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(cuerpo(valor)) }, true);
      else await api('/clientes', { method: 'POST', body: JSON.stringify(cuerpo(valor)) }, true);
      setForm(vacio);
      setEdit(null);
      setRecarga((valorActual) => valorActual + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar al cliente.');
    } finally {
      setOcupado(false);
    }
  }

  async function eliminar(event: FormEvent) {
    event.preventDefault();
    if (!baja || ocupado || baja.movimientos > 0) return;
    setOcupado(true);
    setError('');
    try {
      await api(`/clientes/${baja.id}`, { method: 'DELETE', body: JSON.stringify({ despacho_id: despachoId ? Number(despachoId) : undefined }) }, true);
      setBaja(null);
      setRecarga((valorActual) => valorActual + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos eliminar al cliente.');
    } finally {
      setOcupado(false);
    }
  }

  function abrirEdicion(fila: Fila) {
    setError('');
    setEdit(fila);
    setEditForm({
      tipo: fila.tipo,
      nombre: fila.nombre,
      paterno: fila.paterno ?? '',
      materno: fila.materno ?? '',
      fecha_nacimiento: fila.fecha_nacimiento ?? '',
      genero: fila.genero ?? '',
      domicilio: fila.domicilio ?? '',
      telefono: fila.telefono ?? '',
      correo: fila.correo ?? '',
      rfc: fila.rfc ?? '',
      zona_residencia: fila.zona_residencia ?? '',
      notas: fila.notas ?? '',
    });
  }

  const filas = ordenar(lista?.data ?? [], orden);
  const totalPages = lista?.totalPages ?? 1;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-3xl font-bold">Clientes</h2>
        {elegirDespacho ? (
          <label className="mt-4 block max-w-sm text-sm">
            <span className="mb-1 block text-neutral-500">Despacho</span>
            <select
              className={inputClass}
              value={despachoId}
              onChange={(event) => {
                setDespachoId(event.target.value);
                setPage(1);
                setQ('');
                setQOk('');
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

      {aviso ? <div className="mb-4"><Notice error={aviso} /></div> : null}

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-black"
            placeholder="Buscar por nombre, email, teléfono, zona, etc..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="inline-flex h-9 items-center bg-black px-3 text-sm text-white" onClick={() => { setQ(''); setQOk(''); setPage(1); }}>
            <X className="mr-2 h-4 w-4" />Limpiar
          </button>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
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
                <option key={tamano} value={tamano}>{tamano}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <Th etiqueta="Nombre" columna="nombre" orden={orden} onSort={setOrden} />
              <Th etiqueta="Fecha de Nacimiento" columna="fecha_nacimiento" orden={orden} onSort={setOrden} />
              <Th etiqueta="Género" columna="genero" orden={orden} onSort={setOrden} />
              <Th etiqueta="Dirección" columna="domicilio" orden={orden} onSort={setOrden} />
              <Th etiqueta="Teléfono" columna="telefono" orden={orden} onSort={setOrden} />
              <Th etiqueta="Email" columna="correo" orden={orden} onSort={setOrden} />
              <Th etiqueta="Expedientes" columna="expedientes" orden={orden} onSort={setOrden} titulo="Expedientes del despacho a nombre de este cliente" />
              <Th etiqueta="Movimientos" columna="movimientos" orden={orden} onSort={setOrden} titulo="Movimientos de caja ligados a este cliente" />
              <Th etiqueta="Zona de Residencia" columna="zona" orden={orden} onSort={setOrden} />
              <Th etiqueta="Fecha de Registro" columna="fecha_registro" orden={orden} onSort={setOrden} />
              <Th etiqueta="Autor" columna="autor" orden={orden} onSort={setOrden} />
              <th className="whitespace-nowrap px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-neutral-500">
                  {qOk ? 'No hay clientes que coincidan con la búsqueda.' : 'Todavía no hay clientes.'}
                </td>
              </tr>
            ) : filas.map((fila) => (
              <tr key={fila.id} className="border-b border-neutral-200 align-top">
                <td className="max-w-[11rem] px-3 py-3">{fila.nombre_completo}</td>
                <td className="whitespace-nowrap px-3 py-3">{fechaCorta(fila.fecha_nacimiento)}</td>
                <td className="px-3 py-3">{fila.genero ?? ''}</td>
                <td className="max-w-[14rem] px-3 py-3">{fila.domicilio}</td>
                <td className="whitespace-nowrap px-3 py-3">{telefonoVisible(fila.telefono)}</td>
                <td className="px-3 py-3">{fila.correo}</td>
                <td className="px-3 py-3">{fila.expedientes}</td>
                <td className="px-3 py-3">{fila.movimientos}</td>
                <td className="px-3 py-3">{fila.zona_residencia}</td>
                <td className="whitespace-nowrap px-3 py-3">{fechaRegistro(fila.fecha_registro)}</td>
                <td className="px-3 py-3">{fila.autor}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {puedeEditar ? (
                      <button type="button" aria-label="Editar" title="Editar" onClick={() => abrirEdicion(fila)}>
                        <Edit className="h-4 w-4" />
                      </button>
                    ) : null}
                    {puedeBorrar ? (
                      <button type="button" aria-label="Eliminar" title="Eliminar" onClick={() => { setBaja(fila); setError(''); }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((valor) => valor - 1)}>‹</button>
        <span className="inline-flex h-8 min-w-8 items-center justify-center border border-neutral-900 px-2">{page}</span>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((valor) => valor + 1)}>›</button>
        <button type="button" className="h-8 w-8 border border-neutral-300 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
        <span className="text-neutral-500">Página {page} de {totalPages}</span>
      </div>

      {puedeCrear ? (
        <section className="mt-16">
          <h3 className="mb-6 text-2xl font-bold">Nuevo cliente</h3>
          <form onSubmit={(event) => guardar(event, form)} className="bg-white">
            <Campos valor={form} onChange={setForm} />
            {error && !edit && !baja ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            <button disabled={ocupado} className="mt-5 inline-flex h-10 items-center bg-black px-4 text-sm text-white disabled:opacity-40">
              <Save className="mr-2 h-4 w-4" />Guardar
            </button>
          </form>
        </section>
      ) : null}

      {edit ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={(event) => guardar(event, editForm, edit.id)} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold">Editar cliente</h3>
            <p className="mt-1 text-sm text-neutral-500">En este formulario puedes editar los datos de {edit.nombre_completo}.</p>
            <div className="mt-4">
              <Campos valor={editForm} onChange={setEditForm} />
            </div>
            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 border border-neutral-300 px-3 text-sm" onClick={() => { setEdit(null); setError(''); }}>Cancelar</button>
              <button disabled={ocupado} className="inline-flex h-9 items-center bg-black px-3 text-sm text-white disabled:opacity-40">
                <Save className="mr-2 h-4 w-4" />Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {baja ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={eliminar} className="w-full max-w-md bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold">¿Estás absolutamente seguro?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Esto sacará de la cartera a <strong>{baja.nombre_completo}</strong>. Los expedientes a su nombre se conservan.
            </p>
            {baja.movimientos > 0 ? <p className="mt-3 text-sm text-red-600">Ese cliente tiene movimientos registrados. No se puede eliminar.</p> : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 border border-neutral-300 px-3 text-sm" onClick={() => { setBaja(null); setError(''); }}>Cancelar</button>
              {baja.movimientos > 0 ? null : <button disabled={ocupado} className="h-9 bg-black px-3 text-sm text-white disabled:opacity-40">Eliminar</button>}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Campos({ valor, onChange }: { valor: Forma; onChange: (valor: Forma) => void }) {
  const moral = valor.tipo === 'moral';
  function set<K extends keyof Forma>(clave: K, texto: Forma[K]) {
    onChange({ ...valor, [clave]: texto });
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span>Tipo</span>
        <select className={inputClass} value={valor.tipo} onChange={(event) => onChange({ ...valor, tipo: event.target.value as Forma['tipo'], ...(event.target.value === 'moral' ? { paterno: '', materno: '', fecha_nacimiento: '', genero: '' } : {}) })}>
          <option value="fisica">Persona física</option>
          <option value="moral">Persona moral</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>{moral ? 'Razón social' : 'Nombre'}</span>
        <input required minLength={2} className={inputClass} value={valor.nombre} onChange={(event) => set('nombre', event.target.value)} />
      </label>
      {moral ? null : (
        <>
          <label className="space-y-1 text-sm">
            <span>Apellido paterno</span>
            <input required className={inputClass} value={valor.paterno} onChange={(event) => set('paterno', event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Apellido materno</span>
            <input className={inputClass} value={valor.materno} onChange={(event) => set('materno', event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Fecha de Nacimiento</span>
            <input type="date" max={hoy()} className={inputClass} value={valor.fecha_nacimiento} onChange={(event) => set('fecha_nacimiento', event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Género</span>
            <select className={inputClass} value={valor.genero} onChange={(event) => set('genero', event.target.value as Forma['genero'])}>
              <option value="">Sin especificar</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
        </>
      )}
      <label className="space-y-1 text-sm">
        <span>Dirección</span>
        <input className={inputClass} value={valor.domicilio} onChange={(event) => set('domicilio', event.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Teléfono</span>
        <input inputMode="numeric" maxLength={10} className={inputClass} placeholder="10 dígitos" value={valor.telefono} onChange={(event) => set('telefono', event.target.value.replace(/\D/g, '').slice(0, 10))} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Email</span>
        <input type="email" className={inputClass} value={valor.correo} onChange={(event) => set('correo', event.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span>RFC</span>
        <input maxLength={13} className={`${inputClass} uppercase`} value={valor.rfc} onChange={(event) => set('rfc', event.target.value.toUpperCase())} />
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span>Zona de Residencia</span>
        <input maxLength={120} className={inputClass} value={valor.zona_residencia} onChange={(event) => set('zona_residencia', event.target.value)} />
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span>Notas</span>
        <textarea className="min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black" value={valor.notas} onChange={(event) => set('notas', event.target.value)} />
      </label>
    </div>
  );
}

function Th({ etiqueta, columna, orden, onSort, titulo }: { etiqueta: string; columna: string; orden: Orden; onSort: (orden: Orden) => void; titulo?: string }) {
  const activo = orden?.columna === columna;
  const Icono = !activo ? ArrowUpDown : orden.direccion === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2 align-bottom font-medium">
      <button
        type="button"
        title={titulo}
        className="inline-flex max-w-[8.5rem] items-start gap-1 text-left leading-tight"
        onClick={() => onSort(activo && orden.direccion === 'asc' ? { columna, direccion: 'desc' } : { columna, direccion: 'asc' })}
      >
        {etiqueta}
        <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}

function ordenar(filas: Fila[], orden: Orden) {
  if (!orden) return filas;
  const valor = (fila: Fila) => {
    if (orden.columna === 'expedientes' || orden.columna === 'movimientos') return fila[orden.columna];
    if (orden.columna === 'nombre') return fila.nombre_completo;
    if (orden.columna === 'zona') return fila.zona_residencia ?? '';
    if (orden.columna === 'fecha_nacimiento') return fila.fecha_nacimiento ?? '';
    if (orden.columna === 'fecha_registro') return new Date(fila.fecha_registro).getTime();
    if (orden.columna === 'genero') return fila.genero ?? '';
    if (orden.columna === 'domicilio') return fila.domicilio ?? '';
    if (orden.columna === 'telefono') return fila.telefono ?? '';
    if (orden.columna === 'correo') return fila.correo ?? '';
    if (orden.columna === 'autor') return fila.autor ?? '';
    return '';
  };
  return [...filas].sort((a, b) => {
    const uno = valor(a);
    const dos = valor(b);
    const comparado = typeof uno === 'number' && typeof dos === 'number' ? uno - dos : String(uno).localeCompare(String(dos), 'es');
    return orden.direccion === 'asc' ? comparado : -comparado;
  });
}

function telefonoVisible(valor: string | null) {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length !== 10) return valor ?? '';
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}

function fechaCorta(valor: string | null) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return '';
  const [anio, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaRegistro(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

function hoy() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
