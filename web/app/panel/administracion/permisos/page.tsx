'use client';

import { Pencil, Save, Search, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Notice, PageTitle, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Grupo = { id: number; nombre: string; descripcion: string };
type Aplicacion = { id: number; clave: string; nombre: string; descripcion: string; categoria: string };
type Permiso = {
  id: number;
  aplicacion_id: number;
  insertar: boolean;
  actualizar: boolean;
  eliminar: boolean;
  aplicacion: Aplicacion | null;
};

export default function GruposPage() {
  const [rows, setRows] = useState<Grupo[]>([]);
  const [apps, setApps] = useState<Aplicacion[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editar, setEditar] = useState<Grupo | null>(null);
  const [borrar, setBorrar] = useState<Grupo | null>(null);
  const [grupoId, setGrupoId] = useState(0);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [nuevaApp, setNuevaApp] = useState('');
  const [flags, setFlags] = useState({ insertar: false, actualizar: false, eliminar: false });

  async function load() {
    const [grupos, aplicaciones] = await Promise.all([
      api<Grupo[]>('/grupos', {}, true),
      api<Aplicacion[]>('/grupos/aplicaciones', {}, true),
    ]);
    setRows(grupos);
    setApps(aplicaciones);
    setGrupoId((current) => current || grupos[0]?.id || 0);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los grupos.'));
  }, []);

  useEffect(() => {
    if (!grupoId) {
      setPermisos([]);
      return;
    }
    api<Permiso[]>(`/grupos/${grupoId}/permisos`, {}, true)
      .then(setPermisos)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los permisos.'));
  }, [grupoId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? rows.filter((row) => `${row.nombre} ${row.descripcion}`.toLowerCase().includes(q)) : rows;
  }, [busqueda, rows]);

  const libres = apps.filter((app) => !permisos.some((permiso) => permiso.aplicacion_id === app.id));

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const grupo = await api<Grupo>('/grupos', { method: 'POST', body: JSON.stringify({ nombre, descripcion }) }, true);
      setNombre('');
      setDescripcion('');
      await load();
      setGrupoId(grupo.id);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos crear el grupo.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarGrupo(grupo: Grupo, next: { nombre: string; descripcion: string }) {
    setError('');
    try {
      await api(`/grupos/${grupo.id}`, { method: 'PATCH', body: JSON.stringify(next) }, true);
      setEditar(null);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el grupo.');
      return false;
    }
  }

  async function eliminar() {
    if (!borrar) return;
    setError('');
    try {
      await api(`/grupos/${borrar.id}`, { method: 'DELETE' }, true);
      if (grupoId === borrar.id) setGrupoId(0);
      setBorrar(null);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos eliminar el grupo.');
      setBorrar(null);
    }
  }

  async function agregar(event: FormEvent) {
    event.preventDefault();
    if (!grupoId || !nuevaApp) return;
    setError('');
    try {
      await api(`/grupos/${grupoId}/permisos`, {
        method: 'POST',
        body: JSON.stringify({ aplicacion_id: Number(nuevaApp), ...flags }),
      }, true);
      setNuevaApp('');
      setFlags({ insertar: false, actualizar: false, eliminar: false });
      setPermisos(await api<Permiso[]>(`/grupos/${grupoId}/permisos`, {}, true));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos asignar el módulo.');
    }
  }

  async function cambiar(permiso: Permiso, campo: 'insertar' | 'actualizar' | 'eliminar') {
    const next = { ...permiso, [campo]: !permiso[campo] };
    setPermisos((current) => current.map((item) => (item.id === permiso.id ? next : item)));
    try {
      await api(`/grupos/${grupoId}/permisos`, {
        method: 'POST',
        body: JSON.stringify({
          aplicacion_id: permiso.aplicacion_id,
          insertar: next.insertar,
          actualizar: next.actualizar,
          eliminar: next.eliminar,
        }),
      }, true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el permiso.');
      setPermisos(await api<Permiso[]>(`/grupos/${grupoId}/permisos`, {}, true));
    }
  }

  async function quitar(permiso: Permiso) {
    setError('');
    try {
      await api(`/grupos/${grupoId}/permisos/${permiso.aplicacion_id}`, { method: 'DELETE' }, true);
      setPermisos(await api<Permiso[]>(`/grupos/${grupoId}/permisos`, {}, true));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos quitar el módulo.');
    }
  }

  return (
    <PanelShell>
      <PageTitle title="Seguridad" text="Los grupos viven aquí. Cada grupo decide qué módulos ve el usuario y si puede crear, editar o eliminar." />
      <Notice error={error} />

      <h2 className="mb-4 text-2xl font-semibold">Grupos</h2>
      <div className="relative mb-3 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input className={`${inputClass} pl-9`} placeholder="Buscar grupo..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
      </div>
      <div className="mb-10 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Descripción</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{row.nombre}</td>
                <td className="px-3 py-2">{row.descripcion}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-2 text-xs" onClick={() => setEditar(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-2 text-xs" onClick={() => setBorrar(row)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-neutral-500">No hay grupos registrados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 mt-16 text-2xl font-semibold">Nuevo grupo</h2>
      <form onSubmit={create} className="mb-10 max-w-xl rounded-lg border border-neutral-200 bg-white p-6">
        <label className="grid gap-1 text-sm">
          Nombre
          <input required className={inputClass} value={nombre} onChange={(event) => setNombre(event.target.value)} />
        </label>
        <label className="mt-4 grid gap-1 text-sm">
          Descripción
          <input required className={inputClass} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
        </label>
        <button disabled={guardando} className="mt-6 inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
          <Save className="mr-2 h-4 w-4" />
          {guardando ? 'Guardando...' : 'Guardar grupo'}
        </button>
      </form>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">Gestión de permisos de aplicaciones y grupos</h2>
      <label className="mb-4 grid max-w-sm gap-1 text-sm">
        Grupo
        <select className={inputClass} value={grupoId || ''} onChange={(event) => setGrupoId(Number(event.target.value))}>
          <option value="">Seleccionar grupo</option>
          {rows.map((grupo) => (
            <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
          ))}
        </select>
      </label>
      {grupoId ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="px-3 py-2 font-medium">Módulo</th>
                  <th className="px-3 py-2 font-medium">Crear</th>
                  <th className="px-3 py-2 font-medium">Editar</th>
                  <th className="px-3 py-2 font-medium">Eliminar</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {permisos.map((permiso) => (
                  <tr key={permiso.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2">
                      {permiso.aplicacion?.nombre}
                      <span className="block text-xs text-neutral-500">{permiso.aplicacion?.categoria}</span>
                    </td>
                    <td className="px-3 py-2"><input type="checkbox" checked={permiso.insertar} onChange={() => cambiar(permiso, 'insertar')} /></td>
                    <td className="px-3 py-2"><input type="checkbox" checked={permiso.actualizar} onChange={() => cambiar(permiso, 'actualizar')} /></td>
                    <td className="px-3 py-2"><input type="checkbox" checked={permiso.eliminar} onChange={() => cambiar(permiso, 'eliminar')} /></td>
                    <td className="px-3 py-2">
                      <button type="button" className="text-xs underline" onClick={() => quitar(permiso)}>Quitar</button>
                    </td>
                  </tr>
                ))}
                {permisos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">Este grupo todavía no tiene módulos.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {libres.length ? (
            <form onSubmit={agregar} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm">
                Módulo
                <select className={inputClass} value={nuevaApp} onChange={(event) => setNuevaApp(event.target.value)}>
                  <option value="">Seleccionar módulo</option>
                  {libres.map((app) => (
                    <option key={app.id} value={app.id}>{app.categoria} · {app.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.insertar} onChange={(event) => setFlags({ ...flags, insertar: event.target.checked })} />Crear</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.actualizar} onChange={(event) => setFlags({ ...flags, actualizar: event.target.checked })} />Editar</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.eliminar} onChange={(event) => setFlags({ ...flags, eliminar: event.target.checked })} />Eliminar</label>
              <button className="h-9 bg-black px-4 text-sm font-medium text-white">Agregar</button>
            </form>
          ) : null}
        </>
      ) : null}

      {editar ? (
        <EditarGrupo grupo={editar} onClose={() => setEditar(null)} onSave={(next) => guardarGrupo(editar, next)} />
      ) : null}
      {borrar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white p-5">
            <h2 className="text-xl font-semibold">¿Estás seguro?</h2>
            <p className="mt-2 text-sm text-neutral-600">Se eliminará el grupo <strong>{borrar.nombre}</strong>.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="text-sm" onClick={() => setBorrar(null)}>Cancelar</button>
              <button type="button" className="h-9 bg-red-700 px-4 text-sm font-medium text-white" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      ) : null}
    </PanelShell>
  );
}

function EditarGrupo({
  grupo,
  onClose,
  onSave,
}: {
  grupo: Grupo;
  onClose: () => void;
  onSave: (next: { nombre: string; descripcion: string }) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [descripcion, setDescripcion] = useState(grupo.descripcion);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave({ nombre, descripcion });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-5">
        <h2 className="text-xl font-semibold">Editar grupo</h2>
        <label className="mt-4 grid gap-1 text-sm">
          Nombre
          <input required className={inputClass} value={nombre} onChange={(event) => setNombre(event.target.value)} />
        </label>
        <label className="mt-4 grid gap-1 text-sm">
          Descripción
          <input required className={inputClass} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="text-sm" onClick={onClose}>Cancelar</button>
          <button disabled={busy} className="h-9 bg-black px-4 text-sm font-medium text-white disabled:opacity-40">{busy ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
