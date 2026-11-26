'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Notice, inputClass } from '@/components/panel-shell';
import { esPersonalSoloLectura } from '@/lib/session';

type Usuario = { id: number; name: string; activo?: boolean; responsable: number | null; disponible: number | null; debe_corte: boolean };
type Cliente = { id: number; nombre: string };
type Movimiento = {
  id: number;
  usuario_id: number;
  usuario: string;
  contraparte_usuario_id: number | null;
  contraparte: string | null;
  tipo: string;
  estado: string;
  concepto: string;
  monto: number;
};
type Resumen = {
  es_admin: boolean;
  usuario_id: number;
  saldo: { responsable: number; disponible: number; reservado: number; inicio: number; ingresos: number; egresos: number };
  usuarios: Usuario[];
  clientes: Cliente[];
  movimientos: Movimiento[];
  pendientes: Movimiento[];
};

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const TIPOS: Record<string, string> = { inicio: 'Inicio', ingreso: 'Ingreso', egreso: 'Egreso', transferencia: 'Transferencia' };

export function MovimientosDesk({ despachoId, modo = 'dia' }: { despachoId?: number; modo?: 'dia' | 'inicio' | 'corte' }) {
  const [data, setData] = useState<Resumen | null>(null);
  const usuarioRef = useRef<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [ingreso, setIngreso] = useState({ concepto: '', monto: '', cliente_id: '' });
  const [egreso, setEgreso] = useState({ concepto: '', monto: '' });
  const [transferencia, setTransferencia] = useState({ contraparte_usuario_id: '', monto: '' });
  const [inicio, setInicio] = useState({ usuario_id: '', monto: '' });
  const [lectura, setLectura] = useState(false);

  async function load(nextUser?: number | null) {
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', String(despachoId));
    const foco = nextUser === null ? undefined : (nextUser ?? usuarioRef.current);
    if (foco) params.set('usuario_id', String(foco));
    const path = params.toString() ? `/movimientos?${params.toString()}` : '/movimientos';
    const resp = await api<Resumen>(path, {}, true);
    usuarioRef.current = resp.usuario_id;
    setData(resp);
    setError('');
  }

  useEffect(() => {
    let vivo = true;
    usuarioRef.current = undefined;
    setData(null);
    setError('');
    const params = new URLSearchParams();
    if (despachoId) params.set('despacho_id', String(despachoId));
    const path = params.toString() ? `/movimientos?${params.toString()}` : '/movimientos';
    api<Resumen>(path, {}, true)
      .then((resp) => {
        if (!vivo) return;
        usuarioRef.current = resp.usuario_id;
        setData(resp);
      })
      .catch((reason) => {
        if (!vivo) return;
        setError(reason instanceof ApiError ? reason.message : 'No pudimos cargar los movimientos.');
      });
    return () => {
      vivo = false;
    };
  }, [despachoId]);

  useEffect(() => {
    setLectura(esPersonalSoloLectura('movimientos'));
  }, []);

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar el movimiento.');
    }
  }

  function cuerpo(extra: Record<string, unknown>) {
    return JSON.stringify({ ...extra, despacho_id: despachoId, usuario_id: data?.usuario_id });
  }

  async function enviarIngreso(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/movimientos/ingresos', { method: 'POST', body: cuerpo({ concepto: ingreso.concepto, monto: Number(ingreso.monto), cliente_id: ingreso.cliente_id ? Number(ingreso.cliente_id) : undefined }) }, true);
      setIngreso({ concepto: '', monto: '', cliente_id: '' });
      await load();
    });
  }

  async function enviarEgreso(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/movimientos/egresos', { method: 'POST', body: cuerpo({ concepto: egreso.concepto, monto: Number(egreso.monto) }) }, true);
      setEgreso({ concepto: '', monto: '' });
      await load();
    });
  }

  async function enviarTransferencia(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/movimientos/transferencias', { method: 'POST', body: cuerpo({ contraparte_usuario_id: Number(transferencia.contraparte_usuario_id), monto: Number(transferencia.monto) }) }, true);
      setTransferencia({ contraparte_usuario_id: '', monto: '' });
      await load();
    });
  }

  async function enviarInicio(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/movimientos/inicios', { method: 'POST', body: JSON.stringify({ despacho_id: despachoId, usuario_id: Number(inicio.usuario_id), monto: Number(inicio.monto) }) }, true);
      setInicio({ usuario_id: '', monto: '' });
      await load(Number(inicio.usuario_id));
    });
  }

  async function resolver(id: number, accion: 'aceptar' | 'rechazar') {
    await run(async () => {
      await api(`/movimientos/transferencias/${id}/${accion}`, { method: 'POST', body: JSON.stringify({ despacho_id: despachoId }) }, true);
      await load();
    });
  }

  async function cortar() {
    await run(async () => {
      await api('/movimientos/cortes', { method: 'POST', body: cuerpo({}) }, true);
      await load();
    });
  }

  const otros = (data?.usuarios ?? []).filter((persona) => persona.activo !== false && persona.id !== data?.usuario_id);
  const encabezado = {
    dia: ['Caja del día', 'Ingresos, egresos, transferencias y corte de tu caja.'],
    inicio: ['Inicios de caja', 'El efectivo sale de la caja general y queda a cargo de la persona.'],
    corte: ['Cortes del día', 'El corte entrega el efectivo disponible a caja chica.'],
  }[modo];
  const filas = (data?.movimientos ?? []).filter((mov) => modo !== 'inicio' || mov.tipo === 'inicio');
  const mostrarOperacion = modo === 'dia';
  const mostrarInicio = (modo === 'dia' || modo === 'inicio') && Boolean(data?.es_admin);
  const mostrarCorte = modo === 'dia' || modo === 'corte';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{encabezado[0]}</h1>
        <p className="mt-2 text-neutral-500">{encabezado[1]}</p>
      </header>
      <Notice error={error} />
      {data?.es_admin ? (
        <label className="mb-4 block max-w-sm text-sm">
          <span className="mb-1 block text-neutral-500">Caja de</span>
          <select className={inputClass} value={data.usuario_id} onChange={(event) => load(Number(event.target.value)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'No pudimos cambiar de usuario.'))}>
            {data.usuarios.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
                {persona.activo === false ? ' · sin acceso' : ''}
                {persona.debe_corte ? ' · sin corte' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Responsable" valor={pesos.format(data?.saldo.responsable ?? 0)} />
        <Tarjeta titulo="Disponible" valor={pesos.format(data?.saldo.disponible ?? 0)} />
        <Tarjeta titulo="Apartado en transferencias" valor={pesos.format(data?.saldo.reservado ?? 0)} />
      </div>
      {lectura || (!mostrarOperacion && !mostrarInicio) ? null : <div className="grid gap-4 lg:grid-cols-2">
        {mostrarOperacion ? (
        <form onSubmit={enviarIngreso} className="grid gap-2 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <h2 className="font-semibold">Ingreso</h2>
          <input required className={inputClass} placeholder="Concepto" value={ingreso.concepto} onChange={(event) => setIngreso({ ...ingreso, concepto: event.target.value })} />
          <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={ingreso.monto} onChange={(event) => setIngreso({ ...ingreso, monto: event.target.value })} />
          <select className={inputClass} value={ingreso.cliente_id} onChange={(event) => setIngreso({ ...ingreso, cliente_id: event.target.value })}>
            <option value="">Sin cliente</option>
            {(data?.clientes ?? []).map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
          <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Registrar ingreso</button>
        </form>
        ) : null}
        {mostrarOperacion ? (
        <form onSubmit={enviarEgreso} className="grid gap-2 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <h2 className="font-semibold">Egreso</h2>
          <input required className={inputClass} placeholder="Concepto" value={egreso.concepto} onChange={(event) => setEgreso({ ...egreso, concepto: event.target.value })} />
          <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={egreso.monto} onChange={(event) => setEgreso({ ...egreso, monto: event.target.value })} />
          <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Registrar egreso</button>
        </form>
        ) : null}
        {mostrarOperacion ? (
        <form onSubmit={enviarTransferencia} className="grid gap-2 rounded-lg border border-neutral-200 p-4 shadow-sm">
          <h2 className="font-semibold">Transferencia</h2>
          <select required className={inputClass} value={transferencia.contraparte_usuario_id} onChange={(event) => setTransferencia({ ...transferencia, contraparte_usuario_id: event.target.value })}>
            <option value="">Para</option>
            {otros.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
          <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={transferencia.monto} onChange={(event) => setTransferencia({ ...transferencia, monto: event.target.value })} />
          <p className="text-xs text-neutral-500">El dinero sigue a cargo de quien envía hasta que la otra persona acepta.</p>
          <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Enviar</button>
        </form>
        ) : null}
        {mostrarInicio ? (
          <form onSubmit={enviarInicio} className="grid gap-2 rounded-lg border border-neutral-200 p-4 shadow-sm">
            <h2 className="font-semibold">Inicio de caja</h2>
            <select required className={inputClass} value={inicio.usuario_id} onChange={(event) => setInicio({ ...inicio, usuario_id: event.target.value })}>
              <option value="">Usuario</option>
              {(data?.usuarios ?? []).filter((persona) => persona.activo !== false).map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Monto" value={inicio.monto} onChange={(event) => setInicio({ ...inicio, monto: event.target.value })} />
            <p className="text-xs text-neutral-500">Se resta de la caja general del despacho.</p>
            <button className="h-9 bg-primary text-sm font-medium text-white shadow hover:bg-primary/90">Entregar inicio</button>
          </form>
        ) : null}
      </div>}
      {data?.pendientes.length ? (
        <section className="rounded-lg border border-neutral-200 shadow-sm">
          <h2 className="border-b border-neutral-200 px-4 py-2 font-semibold">Transferencias pendientes</h2>
          {data.pendientes.map((mov) => (
            <div key={mov.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <p>
                {mov.usuario} → {mov.contraparte} · {pesos.format(mov.monto)}
              </p>
              {lectura ? null : (
                <div className="flex gap-2">
                  {data.es_admin || mov.contraparte_usuario_id === data.usuario_id ? (
                    <button type="button" className="h-8 bg-primary px-3 text-white shadow" onClick={() => resolver(mov.id, 'aceptar')}>
                      Aceptar
                    </button>
                  ) : null}
                  <button type="button" className="h-8 border border-neutral-300 px-3" onClick={() => resolver(mov.id, 'rechazar')}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      ) : null}
      {mostrarCorte ? (
      <section className="rounded-lg border border-neutral-200 p-4 shadow-sm">
        <h2 className="font-semibold">Corte</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Inicio {pesos.format(data?.saldo.inicio ?? 0)} + ingresos {pesos.format(data?.saldo.ingresos ?? 0)} − egresos {pesos.format(data?.saldo.egresos ?? 0)} = {pesos.format(data?.saldo.responsable ?? 0)} por entregar a caja chica.
        </p>
        {lectura ? null : (
          <button type="button" className="mt-3 h-9 bg-primary px-4 text-sm font-medium text-white shadow hover:bg-primary/90" onClick={cortar}>
            Realizar corte
          </button>
        )}
      </section>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((mov) => (
              <tr key={mov.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{TIPOS[mov.tipo] ?? mov.tipo}</td>
                <td className="px-3 py-2">{mov.concepto}</td>
                <td className="px-3 py-2">{mov.estado}</td>
                <td className="px-3 py-2">{pesos.format(mov.monto)}</td>
              </tr>
            ))}
            {data && filas.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  No hay movimientos abiertos. El corte deja la caja en ceros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <article className="rounded-lg border border-neutral-200 p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
    </article>
  );
}
