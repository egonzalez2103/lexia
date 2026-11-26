'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { Notice, inputClass } from '@/components/panel-shell';
import { ApiError, api } from '@/lib/api';

type Movimiento = { id: number; caja: string; tipo: string; concepto: string; monto: number; fecha: string };
type Corte = { id: number; caja: string; fecha: string; saldo_contado: number; notas: string | null };
type Resumen = { saldos: { chica: number; general: number }; movimientos: Movimiento[]; cortes: Corte[] };
type Vista = 'chica' | 'general' | 'movimientos' | 'movimientos-general' | 'cortes';

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const boton = 'inline-flex h-10 items-center justify-center bg-black px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40';

const TITULOS: Record<Vista, [string, string]> = {
  chica: ['Cuadres de caja chica', 'Caja chica de la empresa. No está ligada a un despacho.'],
  general: ['Caja general', 'Saldo y movimiento de la caja general de la empresa.'],
  'movimientos-general': ['Movimientos de caja general', 'Ingresos y egresos de la caja general de la empresa.'],
  movimientos: ['Movimientos', 'Ingresos y egresos de la empresa, de caja chica y de caja general.'],
  cortes: ['Cortes del día', 'Cortes de la caja de la empresa.'],
};

export function CajaEmpresa({ vista }: { vista: Vista }) {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState(false);
  const [caja, setCaja] = useState(vista === 'chica' ? 'chica' : 'general');
  const [tipo, setTipo] = useState('ingreso');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [saldo, setSaldo] = useState('');
  const [notas, setNotas] = useState('');
  const [filtroCaja, setFiltroCaja] = useState(vista === 'chica' ? 'chica' : vista === 'general' || vista === 'movimientos-general' ? 'general' : '');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  async function load() {
    setData(await api<Resumen>('/caja', {}, true));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar la caja de la empresa.'));
  }, []);

  const movimientos = useMemo(() => {
    return (data?.movimientos ?? []).filter((row) => {
      if (filtroCaja && row.caja !== filtroCaja) return false;
      if (filtroTipo && row.tipo !== filtroTipo) return false;
      const dia = String(row.fecha).slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      return true;
    });
  }, [data, filtroCaja, filtroTipo, desde, hasta]);

  const cortes = useMemo(() => {
    return (data?.cortes ?? []).filter((row) => (filtroCaja ? row.caja === filtroCaja : true));
  }, [data, filtroCaja]);

  const ingresos = movimientos.filter((row) => row.tipo === 'ingreso').reduce((total, row) => total + row.monto, 0);
  const egresos = movimientos.filter((row) => row.tipo === 'egreso').reduce((total, row) => total + row.monto, 0);
  const titulo = TITULOS[vista];
  const fijaCaja = vista === 'chica' || vista === 'general' || vista === 'movimientos-general';

  async function mover(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/caja/movimientos', { method: 'POST', body: JSON.stringify({ caja: fijaCaja ? filtroCaja : caja, tipo, concepto, monto: Number(monto), fecha }) }, true);
      setConcepto('');
      setMonto('');
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
      await api('/caja/cortes', { method: 'POST', body: JSON.stringify({ caja: fijaCaja ? filtroCaja : caja, fecha, saldo_contado: Number(saldo), notas }) }, true);
      setSaldo('');
      setNotas('');
      setFormulario(false);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el corte.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{formulario ? (vista === 'cortes' ? 'Nuevo corte' : vista === 'chica' ? 'Nuevo cuadre de caja chica' : 'Nuevo movimiento') : titulo[0]}</h1>
          <p className="mt-2 text-neutral-500">{formulario ? 'Queda registrado en la caja de la empresa.' : titulo[1]}</p>
        </div>
        {formulario ? (
          <button type="button" className="h-10 border border-neutral-300 px-4 text-sm font-medium" onClick={() => setFormulario(false)}>Volver al listado</button>
        ) : (
          <button type="button" className={`${boton} w-full sm:w-auto`} onClick={() => setFormulario(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {vista === 'cortes' ? 'Crear corte' : vista === 'chica' ? 'Crear cuadre' : 'Nuevo movimiento'}
          </button>
        )}
      </div>
      <Notice error={error} />

      {formulario ? (
        vista === 'chica' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={mover} className="grid gap-3 rounded-lg border border-neutral-200 p-4">
              <h2 className="text-lg font-semibold">Movimiento</h2>
              <p className="text-sm text-neutral-500">Caja chica de la empresa.</p>
              <select className={inputClass} value={tipo} onChange={(event) => setTipo(event.target.value)}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
              <input required className={inputClass} placeholder="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={monto} onChange={(event) => setMonto(event.target.value)} />
              <input required type="date" className={inputClass} value={fecha} onChange={(event) => setFecha(event.target.value)} />
              <button className={boton}>Registrar</button>
            </form>
            <form onSubmit={cortar} className="grid gap-3 rounded-lg border border-neutral-200 p-4">
              <h2 className="text-lg font-semibold">Corte</h2>
              <p className="text-sm text-neutral-500">Caja chica de la empresa.</p>
              <input required type="date" className={inputClass} value={fecha} onChange={(event) => setFecha(event.target.value)} />
              <input required type="number" min="0" step="0.01" className={inputClass} placeholder="Saldo contado" value={saldo} onChange={(event) => setSaldo(event.target.value)} />
              <textarea className={`${inputClass} h-20 py-2`} placeholder="Notas" value={notas} onChange={(event) => setNotas(event.target.value)} />
              <button className={boton}>Guardar corte</button>
            </form>
          </div>
        ) : vista === 'cortes' ? (
          <form onSubmit={cortar} className="grid max-w-xl gap-3 rounded-lg border border-neutral-200 p-4">
            <h2 className="text-lg font-semibold">Corte</h2>
            {fijaCaja ? <p className="text-sm text-neutral-500">Caja {filtroCaja === 'chica' ? 'chica' : 'general'} de la empresa.</p> : (
              <select className={inputClass} value={caja} onChange={(event) => setCaja(event.target.value)}>
                <option value="general">Caja general</option>
                <option value="chica">Caja chica</option>
              </select>
            )}
            <input required type="date" className={inputClass} value={fecha} onChange={(event) => setFecha(event.target.value)} />
            <input required type="number" min="0" step="0.01" className={inputClass} placeholder="Saldo contado" value={saldo} onChange={(event) => setSaldo(event.target.value)} />
            <textarea className={`${inputClass} h-20 py-2`} placeholder="Notas" value={notas} onChange={(event) => setNotas(event.target.value)} />
            <button className={boton}>Guardar corte</button>
          </form>
        ) : (
          <form onSubmit={mover} className="grid max-w-xl gap-3 rounded-lg border border-neutral-200 p-4">
            <h2 className="text-lg font-semibold">Movimiento</h2>
            {fijaCaja ? <p className="text-sm text-neutral-500">Caja {filtroCaja === 'chica' ? 'chica' : 'general'} de la empresa.</p> : (
              <select className={inputClass} value={caja} onChange={(event) => setCaja(event.target.value)}>
                <option value="general">Caja general</option>
                <option value="chica">Caja chica</option>
              </select>
            )}
            <select className={inputClass} value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
            <input required className={inputClass} placeholder="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
            <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={monto} onChange={(event) => setMonto(event.target.value)} />
            <input required type="date" className={inputClass} value={fecha} onChange={(event) => setFecha(event.target.value)} />
            <button className={boton}>Registrar</button>
          </form>
        )
      ) : (
        <>
          <section className="rounded-lg border border-neutral-200">
            <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">Información de caja</h2>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
              <Dato etiqueta="Caja chica" valor={pesos.format(data?.saldos.chica ?? 0)} />
              <Dato etiqueta="Caja general" valor={pesos.format(data?.saldos.general ?? 0)} />
              <Dato etiqueta="Ingresos del filtro" valor={pesos.format(ingresos)} />
              <Dato etiqueta="Egresos del filtro" valor={pesos.format(egresos)} />
            </div>
          </section>

          {vista !== 'cortes' ? (
            <section className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {vista === 'movimientos' ? (
                  <label className="space-y-1 text-xs text-neutral-500">Caja
                    <select className={inputClass} value={filtroCaja} onChange={(event) => setFiltroCaja(event.target.value)}>
                      <option value="">Todas</option>
                      <option value="general">Caja general</option>
                      <option value="chica">Caja chica</option>
                    </select>
                  </label>
                ) : null}
                <label className="space-y-1 text-xs text-neutral-500">Tipo
                  <select className={inputClass} value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}>
                    <option value="">Todos</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-neutral-500">Desde<input type="date" className={inputClass} value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
                <label className="space-y-1 text-xs text-neutral-500">Hasta<input type="date" className={inputClass} value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
              </div>
            </section>
          ) : null}

          {vista === 'cortes' && cortes.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Todavía no hay un corte de la empresa.
            </div>
          ) : null}

          {vista === 'cortes' || vista === 'chica' || vista === 'general' ? (
            <Tabla titulo="Cortes" vacio="No hay cortes registrados." columnas={['Fecha', 'Caja', 'Saldo contado', 'Notas']}>
              {cortes.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">{String(row.fecha).slice(0, 10)}</td>
                  <td className="px-4 py-3">{row.caja === 'chica' ? 'Chica' : 'General'}</td>
                  <td className="px-4 py-3">{pesos.format(row.saldo_contado)}</td>
                  <td className="px-4 py-3">{row.notas || '—'}</td>
                </tr>
              ))}
            </Tabla>
          ) : null}

          {vista !== 'cortes' ? (
            <Tabla titulo="Movimientos" vacio="No hay movimientos con estos filtros." columnas={['Fecha', 'Caja', 'Tipo', 'Concepto', 'Monto']}>
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
          ) : null}
        </>
      )}
    </div>
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

function Tabla({ titulo, vacio, columnas, children }: { titulo: string; vacio: string; columnas: string[]; children: React.ReactNode }) {
  const filas = Array.isArray(children) ? children : children ? [children] : [];
  const hay = filas.length > 0;
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-white">
            <tr>
              {columnas.map((columna) => <th key={columna} className="h-12 px-4 text-left font-semibold">{columna}</th>)}
            </tr>
          </thead>
          <tbody>
            {hay ? filas : (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={columnas.length}>{vacio}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
