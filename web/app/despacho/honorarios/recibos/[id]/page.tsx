'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiError, api } from '@/lib/api';

type Recibo = { id: number; fecha: string; concepto: string; monto: number; medio: string; cliente: string; asunto: string | null; recibio: string };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function ReciboPage() {
  const params = useParams<{ id: string }>();
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Recibo>(`/abonos/${params.id}`, {}, true)
      .then(setRecibo)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos abrir el recibo.'));
  }, [params.id]);

  return (
    <main className="mx-auto max-w-xl bg-white px-8 py-10 text-black">
      <button type="button" className="mb-6 h-9 bg-black px-4 text-sm font-medium text-white print:hidden" onClick={() => window.print()}>Imprimir o guardar PDF</button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {recibo ? (
        <>
          <h1 className="text-2xl font-semibold">Recibo de honorarios</h1>
          <p className="mt-2 text-sm">Folio {recibo.id} · {recibo.fecha}</p>
          <p className="mt-6 text-sm">Recibimos de {recibo.cliente}{recibo.asunto ? `, por el asunto ${recibo.asunto}` : ''}, la cantidad de {pesos.format(recibo.monto)} por {recibo.concepto}.</p>
          <p className="mt-2 text-sm">Medio: {recibo.medio}. Este recibo no es una factura.</p>
          <p className="mt-16 border-t border-black pt-2 text-sm">Recibió<br />{recibo.recibio}</p>
        </>
      ) : null}
    </main>
  );
}
