'use client';

import { Children, FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { Notice, PanelShell, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Movimiento = { id: number; caja: string; tipo: string; concepto: string; monto: number; fecha: string };
type Corte = { id: number; caja: string; fecha: string; saldo_contado: number; notas: string | null };
type Resumen = { saldos: { chica: number; general: number }; movimientos: Movimiento[]; cortes: Corte[] };

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const boton = 'inline-flex h-10 items-center justify-center bg-black px-4 text-sm font-medium text-white hover:bg-neutral-800';

export default function CajaPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState(false);
  const [mov, setMov] = useState({ caja: 'chica', tipo: 'ingreso', concepto: '', monto: '', fecha: '' });
  const [corte, setCorte] = useState({ caja: 'chica', fecha: '', saldo_contado: '', notas: '' });

  async function load() {
    setData(await api<Resumen>('/caja', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la caja.'));
  }, []);

  async function mover(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja/movimientos', { method: 'POST', body: JSON.stringify({ ...mov, monto: Number(mov.monto) }) }, true);
      setMov({ ...mov, concepto: '', monto: '' });
      setFormulario(false);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos registrar el movimiento.');
    }
  }

  async function cortar(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja/cortes', { method: 'POST', body: JSON.stringify({ ...corte, saldo_contado: Number(corte.saldo_contado) }) }, true);
      setCorte({ ...corte, saldo_contado: '', notas: '' });
      setFormulario(false);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el corte.');
    }
  }

  const hoy = new Date().toLocaleDateString('es-MX');
  const movimientos = data?.movimientos ?? [];
  const cortes = data?.cortes ?? [];

  return (
    <PanelShell>
      <div className="space-y-6">
        {!formulario ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold">Cuadres de caja chica</h1>
                <p className="mt-2 text-neutral-500">Gestiona los cuadres de caja chica de la plataforma.</p>
              </div>
              <button type="button" className={`${boton} w-full sm:w-auto`} onClick={() => setFormulario(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear cuadre
              </button>
            </div>
            <Notice error={error} />
            <section className="rounded-lg border border-neutral-200 bg-white">
              <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Información de caja</h2>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
                <Dato etiqueta="Caja chica" valor={pesos.format(data?.saldos.chica ?? 0)} />
                <Dato etiqueta="Caja general" valor={pesos.format(data?.saldos.general ?? 0)} />
                <Dato etiqueta="Fecha" valor={hoy} />
                <Dato etiqueta="Movimientos" valor={String(movimientos.length)} />
              </div>
            </section>
            {cortes.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Todavía no hay un cuadre registrado.
              </div>
            ) : null}
            <Tabla titulo="Cortes" vacio="No hay cortes registrados.">
              <tr>
                <th className="h-12 px-4 text-left font-semibold">Fecha</th>
                <th className="h-12 px-4 text-left font-semibold">Caja</th>
                <th className="h-12 px-4 text-left font-semibold">Saldo contado</th>
                <th className="h-12 px-4 text-left font-semibold">Notas</th>
              </tr>
              {cortes.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">{String(row.fecha).slice(0, 10)}</td>
                  <td className="px-4 py-3">{row.caja === 'chica' ? 'Chica' : 'General'}</td>
                  <td className="px-4 py-3">{pesos.format(row.saldo_contado)}</td>
                  <td className="px-4 py-3">{row.notas || '—'}</td>
                </tr>
              ))}
            </Tabla>
            <Tabla titulo="Historial" vacio="No hay movimientos registrados.">
              <tr>
                <th className="h-12 px-4 text-left font-semibold">Fecha</th>
                <th className="h-12 px-4 text-left font-semibold">Caja</th>
                <th className="h-12 px-4 text-left font-semibold">Tipo</th>
                <th className="h-12 px-4 text-left font-semibold">Concepto</th>
                <th className="h-12 px-4 text-left font-semibold">Monto</th>
              </tr>
              {movimientos.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">{String(row.fecha).slice(0, 10)}</td>
                  <td className="px-4 py-3">{row.caja === 'chica' ? 'Chica' : 'General'}</td>
                  <td className="px-4 py-3">{row.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
                  <td className="px-4 py-3">{row.concepto}</td>
                  <td className="px-4 py-3">{pesos.format(row.monto)}</td>
                </tr>
              ))}
            </Tabla>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Nuevo cuadre de caja chica</h1>
                <p className="mt-2 text-neutral-500">Registra el movimiento y, si ya contaste el efectivo, el corte.</p>
              </div>
              <button type="button" className="h-10 border border-neutral-300 px-4 text-sm font-medium" onClick={() => setFormulario(false)}>
                Volver al listado
              </button>
            </div>
            <Notice error={error} />
            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={mover} className="grid gap-3 rounded-lg border border-neutral-200 p-4">
                <h2 className="text-lg font-semibold">Movimiento</h2>
                <select className={inputClass} value={mov.caja} onChange={(event) => setMov({ ...mov, caja: event.target.value })}>
                  <option value="chica">Caja chica</option>
                  <option value="general">Caja general</option>
                </select>
                <select className={inputClass} value={mov.tipo} onChange={(event) => setMov({ ...mov, tipo: event.target.value })}>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
                <input required className={inputClass} placeholder="Concepto" value={mov.concepto} onChange={(event) => setMov({ ...mov, concepto: event.target.value })} />
                <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={mov.monto} onChange={(event) => setMov({ ...mov, monto: event.target.value })} />
                <input required type="date" className={inputClass} value={mov.fecha} onChange={(event) => setMov({ ...mov, fecha: event.target.value })} />
                <button className={boton}>Registrar</button>
              </form>
              <form onSubmit={cortar} className="grid gap-3 rounded-lg border border-neutral-200 p-4">
                <h2 className="text-lg font-semibold">Corte</h2>
                <select className={inputClass} value={corte.caja} onChange={(event) => setCorte({ ...corte, caja: event.target.value })}>
                  <option value="chica">Caja chica</option>
                  <option value="general">Caja general</option>
                </select>
                <input required type="date" className={inputClass} value={corte.fecha} onChange={(event) => setCorte({ ...corte, fecha: event.target.value })} />
                <input required type="number" min="0" step="0.01" className={inputClass} placeholder="Saldo contado" value={corte.saldo_contado} onChange={(event) => setCorte({ ...corte, saldo_contado: event.target.value })} />
                <textarea className={`${inputClass} h-20 py-2`} placeholder="Notas" value={corte.notas} onChange={(event) => setCorte({ ...corte, notas: event.target.value })} />
                <button className={boton}>Guardar corte</button>
              </form>
            </div>
          </>
        )}
      </div>
    </PanelShell>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{etiqueta}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}

function Tabla({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode }) {
  const filas = Children.toArray(children);
  const cuerpo = filas.slice(1);
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-white">{filas[0]}</thead>
          <tbody>
            {cuerpo.length > 0 ? cuerpo : (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={5}>{vacio}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
