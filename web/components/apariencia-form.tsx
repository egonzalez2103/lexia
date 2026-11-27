'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FichaPublica, type FichaDespacho } from '@/components/ficha-publica';
import { ApiError, fileHref, uploadArchivo } from '@/lib/api';
import { PALETAS } from '@/lib/paletas';

type Guardar = {
  logo_url: string | null;
  portada_url: string | null;
  paleta: string;
};

export function AparienciaForm({
  despacho,
  onSave,
}: {
  despacho: FichaDespacho;
  onSave: (body: Guardar) => Promise<void>;
}) {
  const [logo, setLogo] = useState(despacho.logo_url);
  const [portada, setPortada] = useState(despacho.portada_url);
  const [paleta, setPaleta] = useState(despacho.paleta || 'negro');
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [subiendo, setSubiendo] = useState<'logo' | 'portada' | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setLogo(despacho.logo_url);
    setPortada(despacho.portada_url);
    setPaleta(despacho.paleta || 'negro');
  }, [despacho]);

  async function subir(archivo: File, destino: 'logo' | 'portada') {
    if (!/\.(png|jpe?g|webp)$/i.test(archivo.name)) {
      setError('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    setError('');
    setGuardado(false);
    setSubiendo(destino);
    try {
      const url = await uploadArchivo(archivo);
      if (destino === 'logo') setLogo(url);
      else setPortada(url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos subir la imagen.');
    } finally {
      setSubiendo(null);
    }
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    setGuardado(false);
    try {
      await onSave({ logo_url: logo, portada_url: portada, paleta });
      setGuardado(true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos guardar la apariencia.');
    } finally {
      setGuardando(false);
    }
  }

  const vista: FichaDespacho = { ...despacho, logo_url: logo, portada_url: portada, paleta };

  return (
    <div className="grid gap-8">
      <form onSubmit={guardar} className="grid gap-6">
        {error ? <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <CampoImagen
            titulo="Logo"
            texto="Se muestra sobre la portada. Si no hay logo, la ficha usa la inicial del despacho."
            url={logo}
            ocupado={subiendo === 'logo'}
            onArchivo={(archivo) => subir(archivo, 'logo')}
            onQuitar={() => {
              setLogo(null);
              setGuardado(false);
            }}
          />
          <CampoImagen
            titulo="Portada"
            texto="Es la imagen ancha de la parte superior. Si no hay portada, se usa el color de acento."
            url={portada}
            ancha
            ocupado={subiendo === 'portada'}
            onArchivo={(archivo) => subir(archivo, 'portada')}
            onQuitar={() => {
              setPortada(null);
              setGuardado(false);
            }}
          />
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Combinación de colores</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PALETAS.map((opcion) => {
              const activa = paleta === opcion.id;
              return (
                <button
                  key={opcion.id}
                  type="button"
                  aria-pressed={activa}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${activa ? 'border-black' : 'border-neutral-200 hover:border-neutral-400'}`}
                  onClick={() => {
                    setPaleta(opcion.id);
                    setGuardado(false);
                  }}
                >
                  <span className="flex h-8 w-12 overflow-hidden rounded" aria-hidden>
                    <span className="h-full w-1/2" style={{ background: opcion.fondo }} />
                    <span className="h-full w-1/2" style={{ background: opcion.acento }} />
                  </span>
                  <span className="font-medium">{opcion.nombre}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={guardando || subiendo !== null} className="h-10 w-fit bg-black px-5 text-sm font-medium text-white disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar apariencia'}
          </button>
          {guardado ? <p className="text-sm text-neutral-700">La apariencia se guardó correctamente.</p> : null}
        </div>
      </form>
      <div>
        <p className="mb-3 text-sm text-neutral-500">Así se verá la ficha pública.</p>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <FichaPublica despacho={vista} encajada />
        </div>
      </div>
    </div>
  );
}

function CampoImagen({
  titulo,
  texto,
  url,
  ancha = false,
  ocupado,
  onArchivo,
  onQuitar,
}: {
  titulo: string;
  texto: string;
  url: string | null;
  ancha?: boolean;
  ocupado: boolean;
  onArchivo: (archivo: File) => void;
  onQuitar: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mt-1 text-sm text-neutral-500">{texto}</p>
      <div className={`mt-3 flex items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 ${ancha ? 'h-28' : 'h-24 w-24'}`}>
        {url ? <img src={fileHref(url)} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-neutral-400">Sin imagen</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center border border-neutral-300 px-3 text-sm">
          {ocupado ? 'Subiendo…' : 'Elegir imagen'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={ocupado}
            onChange={(event) => {
              const archivo = event.target.files?.[0];
              event.target.value = '';
              if (archivo) onArchivo(archivo);
            }}
          />
        </label>
        {url ? (
          <button type="button" className="h-9 px-3 text-sm text-neutral-600 underline" onClick={onQuitar}>
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}
