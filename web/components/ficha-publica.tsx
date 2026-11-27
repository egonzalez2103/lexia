import Link from 'next/link';
import { fileHref } from '@/lib/api';
import { paletaDe } from '@/lib/paletas';

export type FichaDespacho = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  blurb: string | null;
  logo_url: string | null;
  portada_url: string | null;
  paleta: string;
};

export function FichaPublica({ despacho, encajada = false }: { despacho: FichaDespacho; encajada?: boolean }) {
  const paleta = paletaDe(despacho.paleta);
  const logo = fileHref(despacho.logo_url);
  const portada = fileHref(despacho.portada_url);
  const inicial = despacho.name.trim().charAt(0).toUpperCase() || 'D';

  return (
    <main className={encajada ? '' : 'min-h-dvh'} style={{ background: paleta.fondo, color: paleta.tinta }}>
      <section className="relative z-0 h-72 overflow-hidden" style={{ background: paleta.acento }}>
        {portada ? <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        {portada ? <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" /> : null}
      </section>
      <article className="relative z-10 mx-auto max-w-3xl px-6 pb-16">
        <div
          className="-mt-14 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border shadow-sm"
          style={{ background: paleta.fondo, borderColor: paleta.linea }}
        >
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain p-3" />
          ) : (
            <span className="text-4xl font-semibold" style={{ color: paleta.acento }}>
              {inicial}
            </span>
          )}
        </div>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em]" style={{ color: paleta.acento }}>
          Despacho
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">{despacho.name}</h1>
        {despacho.blurb ? <p className="mt-6 max-w-2xl text-lg leading-8">{despacho.blurb}</p> : null}
        <dl className="mt-10 grid gap-4 text-sm">
          {despacho.address ? (
            <div>
              <dt style={{ color: paleta.muted }}>Dirección</dt>
              <dd className="mt-1">{despacho.address}</dd>
            </div>
          ) : null}
          {despacho.phone ? (
            <div>
              <dt style={{ color: paleta.muted }}>Teléfono</dt>
              <dd className="mt-1">{despacho.phone}</dd>
            </div>
          ) : null}
        </dl>
        <Link
          href="/login"
          className="mt-10 inline-flex h-11 items-center px-5 text-sm font-medium"
          style={{ background: paleta.acento, color: paleta.acentoTexto }}
        >
          Entrar al despacho
        </Link>
      </article>
      <footer className="px-6 py-8 text-center text-xs" style={{ color: paleta.muted }}>
        Ficha publicada en Lexia
      </footer>
    </main>
  );
}
