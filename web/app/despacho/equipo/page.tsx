'use client';

import { useEffect, useState } from 'react';
import { DespachoShell } from '@/components/despacho-shell';
import { Notice, PageTitle, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Sede = { id: number; nombre: string };
type Persona = { id: number; name: string; email: string; role: string; funcion: string | null; sede_id: number | null };
type Equipo = { sedes: Sede[]; personas: Persona[] };

export default function EquipoPage() {
  const [data, setData] = useState<Equipo | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setData(await api<Equipo>('/equipo', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el equipo.'));
  }, []);

  async function asignar(persona: Persona, cambio: Partial<Pick<Persona, 'funcion' | 'sede_id'>>) {
    setError('');
    try {
      await api(`/equipo/${persona.id}`, { method: 'PATCH', body: JSON.stringify(cambio) }, true);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos asignar.');
    }
  }

  return (
    <DespachoShell>
      <PageTitle title="Equipo" text="La dirección asigna la función y la sede. Quien tiene sede ve los expedientes de esa sede y los que todavía no tienen sede." />
      <Notice error={error} />
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {data?.personas.map((persona) => (
          <li key={persona.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_180px_180px] md:items-center">
            <div>
              <p className="font-medium">{persona.name}</p>
              <p className="text-neutral-600">{persona.email} · {persona.role === 'ADMIN_DESPACHO' ? 'Dirección' : 'Miembro'}</p>
            </div>
            {persona.role === 'MIEMBRO_DESPACHO' ? (
              <>
                <select className={inputClass} value={persona.funcion ?? 'abogado'} onChange={(event) => asignar(persona, { funcion: event.target.value })}>
                  <option value="abogado">Abogado</option>
                  <option value="pasante">Pasante</option>
                  <option value="caja">Caja</option>
                  <option value="consulta">Consulta</option>
                </select>
                <select className={inputClass} value={persona.sede_id ?? ''} onChange={(event) => asignar(persona, { sede_id: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">Todas las sedes</option>
                  {data.sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
                </select>
              </>
            ) : <span className="text-neutral-500 md:col-span-2">Ve todo el despacho.</span>}
          </li>
        ))}
      </ul>
    </DespachoShell>
  );
}
