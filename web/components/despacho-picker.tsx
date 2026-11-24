'use client';

import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';

type Despacho = { id: number; name: string };

export function DespachoPicker({ children }: { children: (despachoId: number) => React.ReactNode }) {
  const [rows, setRows] = useState<Despacho[]>([]);
  const [id, setId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Despacho[]>('/despachos', {}, true)
      .then((data) => {
        setRows(data);
        if (data[0]) setId(String(data[0].id));
      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los despachos.'));
  }, []);

  return (
    <div>
      <Notice error={error} />
      <label className="mb-4 block max-w-sm text-sm">
        <span className="mb-1 block text-neutral-500">Despacho</span>
        <select className={inputClass} value={id} onChange={(event) => setId(event.target.value)}>
          {rows.length === 0 ? <option value="">Sin despachos</option> : null}
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {id ? children(Number(id)) : <p className="text-sm text-neutral-500">Da de alta un despacho para operar estos módulos.</p>}
    </div>
  );
}
