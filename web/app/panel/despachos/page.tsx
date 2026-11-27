'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AparienciaForm } from '@/components/apariencia-form';
import { Notice, PageTitle, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Usuario = { id: number; name: string; email: string; role: string };
type Despacho = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  blurb: string | null;
  logo_url: string | null;
  portada_url: string | null;
  paleta: string;
  is_active: boolean;
  sitio: string;
  usuarios: Usuario[];
};

const empty = {
  name: '',
  slug: '',
  phone: '',
  address: '',
  blurb: '',
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

function suggestSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function DespachosPage() {
  const [rows, setRows] = useState<Despacho[]>([]);
  const [form, setForm] = useState(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [member, setMember] = useState({ despacho_id: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aparienciaId, setAparienciaId] = useState('');
  const elegido = rows.find((row) => String(row.id) === aparienciaId);

  async function load() {
    setRows(await api<Despacho[]>('/despachos', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los despachos.'));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/despachos', { method: 'POST', body: JSON.stringify(form) }, true);
      setForm(empty);
      setSlugTouched(false);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos crear el despacho.');
    } finally {
      setSaving(false);
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api(
        `/despachos/${member.despacho_id}/miembros`,
        { method: 'POST', body: JSON.stringify({ name: member.name, email: member.email, password: member.password }) },
        true,
      );
      setMember({ despacho_id: member.despacho_id, name: '', email: '', password: '' });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos agregar al abogado.');
    }
  }

  async function toggle(row: Despacho) {
    await api(`/despachos/${row.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !row.is_active }) }, true);
    await load();
  }

  return (
    <PanelShell>
      <PageTitle
        title="Despachos"
        text="Cada despacho recibe un enlace propio. Quien lo contrata entra con el correo de administrador que registres aquí."
      />
      <Notice error={error} />
      <form onSubmit={create} className="mb-8 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
        <input
          required
          className={inputClass}
          placeholder="Nombre del despacho"
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              slug: slugTouched ? form.slug : suggestSlug(event.target.value),
            })
          }
        />
        <input
          required
          className={inputClass}
          placeholder="Enlace, por ejemplo garcia"
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true);
            setForm({ ...form, slug: event.target.value });
          }}
        />
        <input className={inputClass} placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <input className={inputClass} placeholder="Dirección" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <textarea className={`${inputClass} h-20 py-2 md:col-span-2`} placeholder="Texto de la ficha pública" value={form.blurb} onChange={(event) => setForm({ ...form, blurb: event.target.value })} />
        <input required className={inputClass} placeholder="Nombre del administrador" value={form.admin_name} onChange={(event) => setForm({ ...form, admin_name: event.target.value })} />
        <input required type="email" className={inputClass} placeholder="Correo del administrador" value={form.admin_email} onChange={(event) => setForm({ ...form, admin_email: event.target.value })} />
        <input required minLength={8} type="password" className={inputClass} placeholder="Contraseña inicial" value={form.admin_password} onChange={(event) => setForm({ ...form, admin_password: event.target.value })} />
        <button disabled={saving} className="h-9 bg-black text-sm font-medium text-white disabled:opacity-50">
          {saving ? 'Guardando…' : 'Abrir despacho'}
        </button>
      </form>
      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-3 py-2 font-medium">Despacho</th>
              <th className="px-3 py-2 font-medium">Enlace</th>
              <th className="px-3 py-2 font-medium">Administrador</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <Link href={row.sitio} className="underline">{row.slug}</Link>
                </td>
                <td className="px-3 py-2">
                  {row.usuarios.map((user) => user.email).join(', ') || '—'}
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="underline" onClick={() => toggle(row)}>
                    {row.is_active ? 'Activo' : 'Suspendido'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>Todavía no hay despachos.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length > 0 ? (
        <section className="mt-8 border border-neutral-200 p-4">
          <h2 className="font-medium">Personalizar la ficha</h2>
          <p className="mt-1 text-sm text-neutral-500">Logo, portada y colores de la página pública del despacho.</p>
          <select className={`${inputClass} mt-4 max-w-sm`} value={aparienciaId} onChange={(event) => setAparienciaId(event.target.value)}>
            <option value="">Elige el despacho</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          {elegido ? (
            <div className="mt-6">
              <AparienciaForm
                despacho={elegido}
                onSave={async (body) => {
                  const guardado = await api<Despacho>(`/despachos/${elegido.id}`, { method: 'PATCH', body: JSON.stringify(body) }, true);
                  setRows((actual) => actual.map((row) => (row.id === guardado.id ? guardado : row)));
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}
      {rows.length > 0 ? (
        <form onSubmit={addMember} className="mt-8 grid gap-3 border border-neutral-200 p-4 md:grid-cols-2">
          <h2 className="font-medium md:col-span-2">Agregar abogado a un despacho</h2>
          <select required className={inputClass} value={member.despacho_id} onChange={(event) => setMember({ ...member, despacho_id: event.target.value })}>
            <option value="">Elige el despacho</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <input required className={inputClass} placeholder="Nombre" value={member.name} onChange={(event) => setMember({ ...member, name: event.target.value })} />
          <input required type="email" className={inputClass} placeholder="Correo" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} />
          <input required minLength={8} type="password" className={inputClass} placeholder="Contraseña" value={member.password} onChange={(event) => setMember({ ...member, password: event.target.value })} />
          <button className="h-9 bg-black text-sm font-medium text-white">Agregar</button>
        </form>
      ) : null}
    </PanelShell>
  );
}
