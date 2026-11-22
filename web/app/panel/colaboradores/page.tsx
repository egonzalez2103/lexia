'use client';

import { Pencil, Save, Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Notice, PageTitle, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type UsuarioColaborador = { id: number; username: string | null; email: string; activo: boolean };

type Tipo = { id: number; descripcion: string; grupo_id?: number | null; grupo?: string | null };
type Grupo = { id: number; nombre: string };

type Colaborador = {
  id: number;
  nombre: string;
  paterno: string | null;
  materno: string | null;
  puesto: string;
  tipo_id: number | null;
  correo: string | null;
  telefono: string | null;
  fecha_ingreso: string;
  salario_semanal: number;
  tiene_nomina: boolean;
  activo: boolean;
  usuario: UsuarioColaborador | null;
};

type Formulario = {
  nombre: string;
  paterno: string;
  materno: string;
  tipo_id: string;
  correo: string;
  telefono: string;
  salario_semanal: string;
  tiene_nomina: boolean;
  activo: boolean;
  tiene_acceso: boolean;
  grupo_id: string;
  password: string;
  confirmar: string;
  acceso_activo: boolean;
  usuario: string | null;
};

const vacio: Formulario = {
  nombre: '',
  paterno: '',
  materno: '',
  tipo_id: '',
  correo: '',
  telefono: '',
  salario_semanal: '',
  tiene_nomina: true,
  activo: true,
  tiene_acceso: false,
  grupo_id: '',
  password: '',
  confirmar: '',
  acceso_activo: true,
  usuario: null,
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function nombreCompleto(row: Pick<Colaborador, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function aFormulario(row: Colaborador, catalogo: Tipo[]): Formulario {
  let nombre = row.nombre;
  let paterno = row.paterno ?? '';
  if (!paterno && nombre.includes(' ')) {
    const partes = nombre.trim().split(/\s+/);
    paterno = partes.pop() ?? '';
    nombre = partes.join(' ');
  }
  return {
    nombre,
    paterno,
    materno: row.materno ?? '',
    tipo_id: row.tipo_id ? String(row.tipo_id) : '',
    correo: row.correo ?? row.usuario?.email ?? '',
    telefono: row.telefono ?? '',
    salario_semanal: String(row.salario_semanal),
    tiene_nomina: row.tiene_nomina !== false,
    activo: row.activo,
    tiene_acceso: Boolean(row.usuario?.activo),
    grupo_id: String(catalogo.find((tipo) => tipo.id === row.tipo_id)?.grupo_id ?? ''),
    password: '',
    confirmar: '',
    acceso_activo: row.usuario?.activo !== false,
    usuario: row.usuario?.username ?? null,
  };
}

function mayusculas(value: string) {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, '').toLocaleUpperCase('es-MX');
}

function validar(form: Formulario) {
  if (!form.tipo_id) return 'Elige un tipo de colaborador.';
  if (!form.tiene_acceso) return '';
  if (!form.grupo_id) return 'Selecciona el grupo del usuario.';
  if (!form.correo.trim()) return 'El correo es obligatorio para dar acceso al sistema.';
  const alta = !form.usuario;
  if (alta || form.password || form.confirmar) {
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (form.password !== form.confirmar) return 'La confirmación no coincide con la contraseña.';
  }
  return '';
}

function cuerpo(form: Formulario, incluirActivo: boolean) {
  return {
    nombre: form.nombre,
    paterno: form.paterno,
    materno: form.materno || undefined,
    tipo_id: Number(form.tipo_id),
    correo: form.correo || undefined,
    salario_semanal: Number(form.salario_semanal),
    tiene_nomina: form.tiene_nomina,
    ...(incluirActivo ? { activo: form.activo } : {}),
    acceso: {
      tiene_acceso: form.tiene_acceso,
      grupo_id: form.grupo_id ? Number(form.grupo_id) : undefined,
      correo: form.correo || undefined,
      password: form.password || undefined,
      telefono: form.telefono || undefined,
      ...(form.usuario ? { activo: form.acceso_activo } : {}),
    },
  };
}

export default function ColaboradoresPage() {
  const [rows, setRows] = useState<Colaborador[]>([]);
  const [catalogo, setCatalogo] = useState<Tipo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [catalogoListo, setCatalogoListo] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Formulario>(vacio);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [inactivos, setInactivos] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [editar, setEditar] = useState<Colaborador | null>(null);

  async function load() {
    const [personas, tiposColaborador, listaGrupos] = await Promise.all([
      api<Colaborador[]>('/colaboradores', {}, true),
      api<Tipo[]>('/tipos-colaborador', {}, true),
      api<Grupo[]>('/grupos', {}, true),
    ]);
    setRows(personas);
    setCatalogo(tiposColaborador);
    setGrupos(listaGrupos);
    setCatalogoListo(true);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar a los colaboradores.'));
  }, []);

  const tipos = useMemo(
    () => [...new Set(rows.map((row) => row.puesto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((row) => {
      if (inactivos ? row.activo : !row.activo) return false;
      if (tipo !== 'todos' && row.puesto !== tipo) return false;
      if (!q) return true;
      const texto = `${nombreCompleto(row)} ${row.puesto} ${row.correo ?? ''} ${row.usuario?.username ?? ''} ${row.salario_semanal}`.toLowerCase();
      return texto.includes(q);
    });
  }, [busqueda, inactivos, rows, tipo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pagina = filtrados.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);
  const hayFiltros = Boolean(busqueda.trim() || tipo !== 'todos' || inactivos);

  async function create(event: FormEvent) {
    event.preventDefault();
    const fallo = validar(form);
    if (fallo) {
      setError(fallo);
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await api('/colaboradores', { method: 'POST', body: JSON.stringify(cuerpo(form, false)) }, true);
      setForm(vacio);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar al colaborador.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(next: Formulario) {
    if (!editar) return false;
    const fallo = validar(next);
    if (fallo) {
      setError(fallo);
      return false;
    }
    setError('');
    try {
      await api(`/colaboradores/${editar.id}`, { method: 'PATCH', body: JSON.stringify(cuerpo(next, true)) }, true);
      setEditar(null);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar al colaborador.');
      return false;
    }
  }

  return (
    <PanelShell>
      <PageTitle title="Nuevo colaborador" text="El sueldo se captura por semana. Si tiene nómina, entra en el pago de lunes a domingo." />
      <Notice error={error} />
      <form onSubmit={create} className="mb-10 rounded-lg border border-neutral-200 bg-white p-6">
        <Campos form={form} setForm={setForm} catalogo={catalogo} grupos={grupos} catalogoListo={catalogoListo} />
        <button disabled={guardando} className="mt-6 inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
          <Save className="mr-2 h-4 w-4" />
          {guardando ? 'Guardando...' : 'Guardar colaborador'}
        </button>
      </form>

      <h2 className="mb-4 text-3xl font-semibold">Lista de colaboradores</h2>
      {tipos.length > 0 ? (
        <div className="mb-3 inline-flex max-w-full flex-wrap rounded-lg bg-neutral-100 p-1 text-sm">
          <button type="button" className={`rounded-md px-3 py-1.5 ${tipo === 'todos' ? 'bg-white font-medium shadow-sm' : 'text-neutral-600'}`} onClick={() => { setTipo('todos'); setPage(1); }}>
            Todos
          </button>
          {tipos.map((item) => (
            <button key={item} type="button" className={`rounded-md px-3 py-1.5 ${tipo === item ? 'bg-white font-medium shadow-sm' : 'text-neutral-600'}`} onClick={() => { setTipo(item); setPage(1); }}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input className={`${inputClass} pl-9`} placeholder="Buscar por nombre, tipo, sueldo..." value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPage(1); }} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2 text-neutral-600">
          Por página
          <select className="h-9 rounded-md border border-neutral-300 bg-white px-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={inactivos} onChange={(event) => { setInactivos(event.target.checked); setPage(1); }} />
          Mostrar inactivos
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Tipo de colaborador</th>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Sueldo Semanal</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-3 py-2 uppercase">{nombreCompleto(row)}</td>
                <td className="px-3 py-2">{row.puesto}</td>
                <td className="px-3 py-2">{row.usuario?.activo ? row.usuario.username : 'Sin acceso'}</td>
                <td className="px-3 py-2 tabular-nums">{pesos.format(row.salario_semanal)}</td>
                <td className="px-3 py-2">
                  <button type="button" aria-label="Editar" title="Editar" className="inline-flex h-8 w-8 items-center justify-center text-neutral-700" onClick={() => setEditar(row)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {pagina.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                  {tipo !== 'todos' && !busqueda.trim() && !inactivos
                    ? `No hay colaboradores de tipo ${tipo}.`
                    : inactivos && !busqueda.trim() && tipo === 'todos'
                      ? 'No hay colaboradores inactivos.'
                      : hayFiltros
                        ? 'No hay colaboradores que coincidan con los filtros.'
                        : 'No hay colaboradores activos.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {filtrados.length > pageSize ? (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button type="button" className="rounded-md border px-2 py-1 disabled:opacity-40" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Anterior</button>
          <span>{pageSafe} / {totalPages}</span>
          <button type="button" className="rounded-md border px-2 py-1 disabled:opacity-40" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>Siguiente</button>
        </div>
      ) : null}

      {editar ? (
        <EditarDialog
          fila={editar}
          onClose={() => setEditar(null)}
          catalogo={catalogo}
          grupos={grupos}
          onSave={guardarEdicion}
        />
      ) : null}
    </PanelShell>
  );
}

function Campos({
  form,
  setForm,
  catalogo,
  grupos,
  catalogoListo = true,
  incluirActivo = false,
}: {
  form: Formulario;
  setForm: (next: Formulario) => void;
  catalogo: Tipo[];
  grupos: Grupo[];
  catalogoListo?: boolean;
  incluirActivo?: boolean;
}) {
  function set<K extends keyof Formulario>(key: K, value: Formulario[K]) {
    setForm({ ...form, [key]: value });
  }

  const puesto = catalogo.find((tipo) => String(tipo.id) === form.tipo_id);
  const grupoFijo = puesto?.grupo_id ? puesto : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm sm:col-span-2">
        Tipo de colaborador <span className="text-red-600">*</span>
        <select
          required
          className={inputClass}
          value={form.tipo_id}
          onChange={(event) => {
            const tipoId = event.target.value;
            const puestoNuevo = catalogo.find((tipo) => String(tipo.id) === tipoId);
            setForm({ ...form, tipo_id: tipoId, grupo_id: puestoNuevo?.grupo_id ? String(puestoNuevo.grupo_id) : '' });
          }}
        >
          <option value="">Seleccionar tipo de colaborador</option>
          {catalogo.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>{tipo.descripcion}</option>
          ))}
        </select>
        {catalogoListo && catalogo.length === 0 ? <span className="text-neutral-500">No hay tipos de colaborador en el catálogo. No se podrá guardar un alta hasta que existan registros.</span> : null}
      </label>
      <label className="grid gap-1 text-sm">
        Nombre
        <input required className={inputClass} placeholder="Nombre del colaborador" value={form.nombre} onChange={(event) => set('nombre', mayusculas(event.target.value))} />
      </label>
      <label className="grid gap-1 text-sm">
        Apellido Paterno
        <input required className={inputClass} placeholder="Apellido paterno" value={form.paterno} onChange={(event) => set('paterno', mayusculas(event.target.value))} />
      </label>
      <label className="grid gap-1 text-sm">
        Apellido Materno
        <input className={inputClass} placeholder="Apellido materno" value={form.materno} onChange={(event) => set('materno', mayusculas(event.target.value))} />
      </label>
      <label className="grid gap-1 text-sm">
        Sueldo Semanal
        <input required type="number" min="0" step="0.01" className={inputClass} value={form.salario_semanal} onChange={(event) => set('salario_semanal', event.target.value)} />
      </label>
      <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-4 sm:col-span-2">
        <div>
          <p className="text-sm font-medium">Tiene nómina</p>
          <p className="text-sm text-neutral-500">Apagado, no aparece en nóminas.</p>
        </div>
        <input type="checkbox" checked={form.tiene_nomina} onChange={(event) => set('tiene_nomina', event.target.checked)} />
      </div>
      <div className="space-y-4 rounded-md border border-neutral-200 p-4 sm:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Acceso al sistema</p>
            <p className="text-sm text-neutral-500">Apagado, solo es colaborador. Encendido, también puede iniciar sesión.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.tiene_acceso}
            aria-label="Acceso al sistema"
            className={`relative h-6 w-11 shrink-0 rounded-full ${form.tiene_acceso ? 'bg-black' : 'bg-neutral-300'}`}
            onClick={() => set('tiene_acceso', !form.tiene_acceso)}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${form.tiene_acceso ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        {form.tiene_acceso ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Grupo
              <select
                className={inputClass}
                value={grupoFijo ? String(grupoFijo.grupo_id) : form.grupo_id}
                disabled={Boolean(grupoFijo)}
                onChange={(event) => set('grupo_id', event.target.value)}
              >
                <option value="">Seleccione grupo...</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
                ))}
              </select>
              <span className="text-neutral-500">
                {grupoFijo
                  ? 'Es el mismo que el puesto, para que el usuario y el colaborador no digan cosas distintas.'
                  : 'Este puesto no tiene grupo. Asígnelo en Tipos de colaborador para que queden iguales.'}
              </span>
            </label>
            <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm sm:col-span-2">
              <p className="font-medium">Usuario</p>
              <p className="text-neutral-500">
                {form.usuario
                  ? `${form.usuario}. No se modifica, para conservar la misma estructura en todas las cuentas.`
                  : 'Se genera al terminar el registro: primer nombre, un punto y el apellido paterno. Por ejemplo, ruben.campos.'}
              </p>
            </div>
            <label className="grid gap-1 text-sm">
              Correo
              <input required type="email" className={inputClass} value={form.correo} onChange={(event) => set('correo', event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              {form.usuario ? 'Nueva contraseña' : 'Contraseña'}
              <input type="password" autoComplete="new-password" className={inputClass} placeholder="******" value={form.password} onChange={(event) => set('password', event.target.value)} />
              {form.usuario ? <span className="text-neutral-500">En blanco conserva la actual.</span> : null}
            </label>
            <label className="grid gap-1 text-sm">
              Confirmar contraseña
              <input type="password" autoComplete="new-password" className={inputClass} placeholder="******" value={form.confirmar} onChange={(event) => set('confirmar', event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Teléfono
              <input className={inputClass} inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={form.telefono} onChange={(event) => set('telefono', event.target.value.replace(/\D/g, '').slice(0, 10))} />
            </label>
            {form.usuario ? (
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-1" checked={form.acceso_activo} onChange={(event) => set('acceso_activo', event.target.checked)} />
                <span>
                  Puede iniciar sesión
                  <span className="block text-neutral-500">Apagado, el colaborador queda inactivo y no entra al sistema.</span>
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
      {incluirActivo ? (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.activo} onChange={(event) => set('activo', event.target.checked)} />
          Activo
        </label>
      ) : null}
    </div>
  );
}

function EditarDialog({
  fila,
  catalogo,
  grupos,
  onClose,
  onSave,
}: {
  fila: Colaborador;
  catalogo: Tipo[];
  grupos: Grupo[];
  onClose: () => void;
  onSave: (form: Formulario) => Promise<boolean>;
}) {
  const [form, setForm] = useState(() => aFormulario(fila, catalogo));
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave(form);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto bg-white p-5">
        <h2 className="text-xl font-semibold">Editar colaborador</h2>
        <div className="mt-4">
          <Campos form={form} setForm={setForm} catalogo={catalogo} grupos={grupos} incluirActivo />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="text-sm" onClick={onClose}>Cancelar</button>
          <button disabled={busy} className="inline-flex h-9 items-center bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
            <Save className="mr-2 h-4 w-4" />
            {busy ? 'Guardando...' : 'Guardar colaborador'}
          </button>
        </div>
      </form>
    </div>
  );
}
