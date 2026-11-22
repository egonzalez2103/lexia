'use client';

import { Pencil, Save, Search, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Notice, PageTitle, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Grupo = { id: number; nombre: string };
type Tipo = { id: number; descripcion: string; grupo_id: number | null; grupo: string | null };

export default function TiposColaboradorPage() {
  const [rows, setRows] = useState<Tipo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [editar, setEditar] = useState<Tipo | null>(null);
  const [borrar, setBorrar] = useState<Tipo | null>(null);

  async function load() {
    const [tipos, listaGrupos] = await Promise.all([
      api<Tipo[]>('/tipos-colaborador', {}, true),
      api<Grupo[]>('/grupos', {}, true),
    ]);
    setRows(tipos);
    setGrupos(listaGrupos);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los tipos de colaborador.'));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? rows.filter((row) => row.descripcion.toLowerCase().includes(q)) : rows;
  }, [busqueda, rows]);
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pagina = filtrados.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api('/tipos-colaborador', { method: 'POST', body: JSON.stringify({ descripcion, grupo_id: grupoId ? Number(grupoId) : null }) }, true);
      setDescripcion('');
      setGrupoId('');
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos crear el tipo de colaborador.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardar(tipo: Tipo, next: { descripcion: string; grupo_id: number | null }) {
    setError('');
    try {
      await api(`/tipos-colaborador/${tipo.id}`, { method: 'PATCH', body: JSON.stringify(next) }, true);
      setEditar(null);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el tipo de colaborador.');
      return false;
    }
  }

  async function eliminar() {
    if (!borrar) return;
    setError('');
    try {
      await api(`/tipos-colaborador/${borrar.id}`, { method: 'DELETE' }, true);
      setBorrar(null);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos eliminar el tipo de colaborador.');
      setBorrar(null);
    }
  }

  return (
    <PanelShell>
      <PageTitle title="Nuevo tipo de colaborador" text="El catálogo alimenta el puesto de cada colaborador." />
      <Notice error={error} />
      <form onSubmit={create} className="mb-10 max-w-xl rounded-lg border border-neutral-200 bg-white p-6">
        <label className="grid gap-1 text-sm">
          Descripción
          <input required className={inputClass} placeholder="Ej. Abogado, Pasante, Contador..." value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
        </label>
        <label className="mt-4 grid gap-1 text-sm">
          Grupo de usuario
          <select className={inputClass} value={grupoId} onChange={(event) => setGrupoId(event.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
            ))}
          </select>
          <span className="text-neutral-500">El colaborador con este puesto usa este grupo al darle acceso.</span>
        </label>
        <button disabled={guardando} className="mt-6 inline-flex h-10 items-center bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
          <Save className="mr-2 h-4 w-4" />
          {guardando ? 'Guardando...' : 'Guardar tipo'}
        </button>
      </form>

      <h2 className="mb-4 text-3xl font-semibold">Tipos de colaborador</h2>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className={`${inputClass} pl-9`} placeholder="Buscar por descripción..." value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPage(1); }} />
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
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Descripción</th>
              <th className="px-3 py-2 font-medium">Grupo de usuario</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{row.id}</td>
                <td className="px-3 py-2">{row.descripcion}</td>
                <td className="px-3 py-2">{row.grupo ?? 'Sin grupo'}</td>
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
            {pagina.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-neutral-500">
                  {busqueda.trim() ? 'No hay tipos que coincidan con la búsqueda.' : 'No hay tipos de colaborador registrados.'}
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
        <EditarTipo tipo={editar} grupos={grupos} onClose={() => setEditar(null)} onSave={(next) => guardar(editar, next)} />
      ) : null}
      {borrar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white p-5">
            <h2 className="text-xl font-semibold">¿Estás seguro?</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Se eliminará el tipo de colaborador <strong>{borrar.descripcion}</strong>.
            </p>
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

function EditarTipo({
  tipo,
  grupos,
  onClose,
  onSave,
}: {
  tipo: Tipo;
  grupos: Grupo[];
  onClose: () => void;
  onSave: (next: { descripcion: string; grupo_id: number | null }) => Promise<boolean>;
}) {
  const [descripcion, setDescripcion] = useState(tipo.descripcion);
  const [grupoId, setGrupoId] = useState(tipo.grupo_id ? String(tipo.grupo_id) : '');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave({ descripcion, grupo_id: grupoId ? Number(grupoId) : null });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-5">
        <h2 className="text-xl font-semibold">Editar tipo de colaborador</h2>
        <label className="mt-4 grid gap-1 text-sm">
          Descripción
          <input required className={inputClass} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
        </label>
        <label className="mt-4 grid gap-1 text-sm">
          Grupo de usuario
          <select className={inputClass} value={grupoId} onChange={(event) => setGrupoId(event.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
            ))}
          </select>
          <span className="text-neutral-500">El colaborador con este puesto usa este grupo al darle acceso.</span>
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="text-sm" onClick={onClose}>Cancelar</button>
          <button disabled={busy} className="h-9 bg-black px-4 text-sm font-medium text-white disabled:opacity-40">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
