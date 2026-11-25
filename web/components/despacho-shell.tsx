'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { clearSession, homeFor, readSession, type SessionUser } from '@/lib/session';

export function DespachoShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.user.role !== 'ADMIN_DESPACHO' && session.user.role !== 'MIEMBRO_DESPACHO') {
      router.replace(homeFor(session.user));
      return;
    }
    setUser(session.user);
    api<SessionUser>('/auth/me', {}, true).catch((reason) => {
      if (reason instanceof ApiError) {
        clearSession();
        router.replace('/login');
      }
    });
  }, [router]);

  if (!user) return null;

  const links = [
    ['/despacho', 'Expedientes'],
    ['/despacho/clientes', 'Clientes'],
    ['/despacho/catalogos/movimientos', 'Tipos de movimiento'],
    ['/despacho/movimientos', 'Movimientos'],
    ['/despacho/movimientos/caja', 'Caja del día'],
    ...(user.role === 'ADMIN_DESPACHO' ? [['/despacho/caja-general', 'Caja general']] : []),
    ['/despacho/comisiones', 'Comisiones'],
    ...(user.role === 'ADMIN_DESPACHO' ? [['/despacho/registro-ediciones', 'Registro de ediciones']] : []),
    ...(user.despacho_slug ? [[`/sitio/${user.despacho_slug}`, 'Ficha pública']] : []),
  ];

  return (
    <div className="min-h-dvh bg-white text-black">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Link href="/despacho">
          <img src="/lexia-logo.png" alt="Lexia" className="h-10 w-auto" />
        </Link>
        <button
          type="button"
          className="text-sm font-semibold"
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
        >
          Cerrar sesión
        </button>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1 text-sm">
          {links.map(([href, label]) => {
            const coincide = href === '/despacho' ? pathname === '/despacho' || pathname.startsWith('/despacho/expedientes') : pathname === href || pathname.startsWith(`${href}/`);
            const active = coincide && !links.some(([otro]) => otro !== href && otro.length > href.length && (pathname === otro || pathname.startsWith(`${otro}/`)));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 ${active ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
