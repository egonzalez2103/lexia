import { notFound } from 'next/navigation';
import { FichaPublica, type FichaDespacho } from '@/components/ficha-publica';

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
  const despacho = (await response.json()) as FichaDespacho;
  return <FichaPublica despacho={despacho} />;
}
