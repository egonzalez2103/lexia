'use client';

import { ArrowLeftRight, Banknote, ChevronDown, Coins, Contact, FolderOpen, History, Landmark, Plus, Tags } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { clearSession, homeFor, readSession, type SessionUser } from '@/lib/session';

export function DespachoShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cajasAbiertas, setCajasAbiertas] = useState(() => pathname.startsWith('/despacho/movimientos') || pathname.startsWith('/despacho/caja-general'));

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

  const sueltos: Array<[string, string, typeof FolderOpen]> = [
    ['/despacho', 'Expedientes', FolderOpen],
    ['/despacho/clientes', 'Clientes', Contact],
    ['/despacho/catalogos/movimientos', 'Tipos de movimiento', Tags],
    ['/despacho/comisiones', 'Comisiones', Coins],
  ];
  if (user.role === 'ADMIN_DESPACHO') sueltos.push(['/despacho/registro-ediciones', 'Registro de ediciones', History]);
  const cajas: Array<[string, string, typeof Landmark]> = [
    ['/despacho/movimientos/cortes', 'Cortes del día', Banknote],
    ['/despacho/movimientos/inicios', 'Inicios de caja', Plus],
    ['/despacho/movimientos', 'Movimientos', ArrowLeftRight],
  ];
  if (user.role === 'ADMIN_DESPACHO') cajas.push(['/despacho/caja-general', 'Movimientos de caja general', Landmark]);
  const hrefs = [...sueltos.map(([href]) => href), ...cajas.map(([href]) => href)];
  function activo(href: string) {
    const coincide = href === '/despacho' ? pathname === '/despacho' || pathname.startsWith('/despacho/expedientes') : pathname === href || pathname.startsWith(`${href}/`);
    if (!coincide) return false;
    return !hrefs.some((otro) => otro !== href && otro.length > href.length && (pathname === otro || pathname.startsWith(`${otro}/`)));
  }
  const item = (active: boolean) => `flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-black text-white' : 'text-neutral-800 hover:bg-neutral-100'}`;

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
          {sueltos.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={item(activo(href))}>
              <Icon className="mr-2 h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
          <div className="mt-3">
            <button type="button" className={`${item(cajas.some(([href]) => activo(href)))} justify-between`} onClick={() => setCajasAbiertas((open) => !open)}>
              <span className="flex items-center"><Landmark className="mr-2 h-4 w-4" />Control de cajas</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${cajasAbiertas ? 'rotate-180' : ''}`} />
            </button>
            {cajasAbiertas ? (
              <div className="ml-4 mt-2 space-y-2">
                {cajas.map(([href, label, Icon]) => (
                  <Link key={href} href={href} className={item(activo(href))}>
                    <Icon className="mr-2 h-3 w-3 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {user.despacho_slug ? (
            <Link href={`/sitio/${user.despacho_slug}`} className="mt-3 px-3 py-2 text-sm text-neutral-600 hover:text-black">Ficha pública</Link>
          ) : null}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
