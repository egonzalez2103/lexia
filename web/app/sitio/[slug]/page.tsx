import Link from 'next/link';
import { notFound } from 'next/navigation';

type Despacho = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  blurb: string | null;
};

export default async function SitioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${base}/despachos/publico/${slug}`, { cache: 'no-store' });
  if (response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p>No pudimos abrir la ficha en este momento.</p>
      </main>
    );
  }
  const despacho = (await response.json()) as Despacho;

  return (
    <main className="min-h-dvh bg-white text-black">
      <header className="border-b border-neutral-200 px-6 py-5">
        <img src="/lexia-logo.svg" alt="Lexia" className="h-10 w-auto" />
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Despacho</p>
        <h1 className="mt-3 font-serif text-5xl">{despacho.name}</h1>
        {despacho.blurb ? <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">{despacho.blurb}</p> : null}
        <dl className="mt-10 grid gap-4 text-sm">
          {despacho.address ? (
            <div>
              <dt className="text-neutral-500">Dirección</dt>
              <dd>{despacho.address}</dd>
            </div>
          ) : null}
          {despacho.phone ? (
            <div>
              <dt className="text-neutral-500">Teléfono</dt>
              <dd>{despacho.phone}</dd>
            </div>
          ) : null}
        </dl>
        <Link href="/login" className="mt-10 inline-flex h-10 items-center bg-black px-5 text-sm font-medium text-white">
          Entrar al despacho
        </Link>
      </article>
    </main>
  );
}
