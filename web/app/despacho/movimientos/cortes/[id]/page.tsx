'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiError, api } from '@/lib/api';

type Corte = {
  id: number;
  fecha: string;
  usuario: string;
  inicio: number;
  ingresos: number;
  egresos: number;
  total: number;
  movimientos: Array<{ id: number; tipo: string; concepto: string; monto: number; fecha: string }>;
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function CorteImprimirPage() {
  const params = useParams<{ id: string }>();
  const [corte, setCorte] = useState<Corte | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Corte>(`/movimientos/cortes/${params.id}`, {}, true)
      .then(setCorte)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el corte.'));
  }, [params.id]);

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-black">
      <button type="button" className="mb-6 h-9 bg-black px-4 text-sm font-medium text-white print:hidden" onClick={() => window.print()}>Imprimir o guardar PDF</button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {corte ? (
        <>
          <h1 className="text-2xl font-semibold">Corte de caja</h1>
          <p className="mt-2 text-sm">Folio {corte.id} · {corte.fecha} · {corte.usuario}</p>
          <table className="mt-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2">Fecha</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Concepto</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {corte.movimientos.map((row) => (
                <tr key={row.id} className="border-b border-neutral-200">
                  <td className="py-2">{row.fecha}</td>
                  <td className="py-2">{row.tipo}</td>
                  <td className="py-2">{row.concepto}</td>
                  <td className="py-2 text-right">{pesos.format(row.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm">Inicio {pesos.format(corte.inicio)} + ingresos {pesos.format(corte.ingresos)} − egresos {pesos.format(corte.egresos)}</p>
          <p className="mt-1 text-lg font-semibold">Total a entregar {pesos.format(corte.total)}</p>
          <div className="mt-16 grid grid-cols-2 gap-12 text-sm">
            <p className="border-t border-black pt-2">Entregó<br />{corte.usuario}</p>
            <p className="border-t border-black pt-2">Recibió en caja chica<br />Nombre y firma</p>
          </div>
        </>
      ) : null}
    </main>
  );
}
