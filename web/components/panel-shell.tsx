'use client';

import {
  Building2,
  ChevronDown,
  Home,
  Landmark,
  Library,
  LockKeyhole,
  Menu,
  ScrollText,
  Shield,
  Tags,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { clearSession, homeFor, readSession, saveSession, type SessionUser } from '@/lib/session';

type NavLink = { href: string; label: string; icon: LucideIcon; clave?: string };
type NavGroup = { label: string; icon: LucideIcon; children: NavLink[] };
type NavItem = NavLink | NavGroup;

const NAV: NavItem[] = [
  { href: '/panel', label: 'Inicio', icon: Home },
  {
    label: 'Administración',
    icon: Shield,
    children: [
      { href: '/panel/despachos', label: 'Despachos', icon: Building2, clave: 'despachos' },
      { href: '/panel/administracion/permisos', label: 'Permisos', icon: LockKeyhole, clave: 'grupos' },
    ],
  },
  {
    label: 'Recursos humanos',
    icon: UserCog,
    children: [{ href: '/panel/colaboradores', label: 'Colaboradores', icon: Users, clave: 'colaboradores' }],
  },
  {
    label: 'Catálogos',
    icon: Library,
    children: [
      { href: '/panel/catalogos/tipos-colaborador', label: 'Tipos de colaborador', icon: Tags, clave: 'tipos-colaborador' },
    ],
  },
  { href: '/panel/caja', label: 'Control de cajas', icon: Landmark, clave: 'caja' },
  { href: '/panel/nominas', label: 'Nóminas', icon: Wallet, clave: 'nominas' },
  { href: '/panel/reportes', label: 'Reportes', icon: ScrollText, clave: 'reportes' },
];

const ROLES: Record<SessionUser['role'], string> = {
  DUENO: 'Dueño de la plataforma',
  PERSONAL: 'Personal de la plataforma',
  ADMIN_DESPACHO: 'Administrador del despacho',
  MIEMBRO_DESPACHO: 'Miembro del despacho',
};

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

function isCurrent(pathname: string, href: string) {
  if (href === '/panel') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navFor(user: SessionUser): NavItem[] {
  if (user.role === 'DUENO') return NAV;
  const claves = new Set((user.permisos ?? []).map((permiso) => permiso.clave));
  return NAV.flatMap((item): NavItem[] => {
    if (!isGroup(item)) return !item.clave || claves.has(item.clave) ? [item] : [];
    const children = item.children.filter((child) => !child.clave || claves.has(child.clave));
    return children.length ? [{ ...item, children }] : [];
  });
}

function openGroupFor(pathname: string) {
  const current = NAV.find((item) => isGroup(item) && item.children.some((child) => isCurrent(pathname, child.href)));
  return current && isGroup(current) ? current.label : null;
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(() => openGroupFor(pathname));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.user.role !== 'DUENO' && session.user.role !== 'PERSONAL') {
      router.replace(homeFor(session.user));
      return;
    }
    setUser(session.user);
    api<SessionUser>('/auth/me', {}, true)
      .then((fresh) => {
        const current = readSession();
        if (current) saveSession({ ...current, user: fresh });
        setUser(fresh);
      })
      .catch((reason) => {
        if (reason instanceof ApiError) {
          clearSession();
          router.replace('/login');
        }
      });
  }, [router]);

  useEffect(() => {
    setOpenGroup(openGroupFor(pathname));
    setMenuOpen(false);
  }, [pathname]);

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-white text-black">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-neutral-200 bg-white px-2 xl:hidden">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <Link href="/panel" className="absolute left-1/2 -translate-x-1/2">
          <img src="/lexia-logo.png" alt="Lexia" className="h-9 w-auto" />
        </Link>
      </header>

      <aside
        className={`fixed bottom-0 left-0 top-14 z-40 w-64 border-r border-neutral-200 bg-white transition-transform duration-300 xl:top-0 xl:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="hidden shrink-0 items-center justify-center px-4 pt-8 xl:flex">
            <Link href="/panel">
              <img src="/lexia-logo.png" alt="Lexia" className="h-14 w-auto" />
            </Link>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {navFor(user).map((item) => {
              if (!isGroup(item)) {
                const Icon = item.icon;
                const active = isCurrent(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-1 flex w-full items-center rounded-md px-3 py-2 text-sm ${active ? 'font-semibold text-black' : 'text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              }
              const Icon = item.icon;
              const open = openGroup === item.label;
              const active = item.children.some((child) => isCurrent(pathname, child.href));
              return (
                <div key={item.label} className="mb-1">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${active ? 'font-semibold text-black' : 'text-neutral-700 hover:bg-neutral-100'}`}
                    aria-expanded={open}
                    onClick={() => setOpenGroup(open ? null : item.label)}
                  >
                    <span className="flex min-w-0 items-center">
                      <Icon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    inert={!open}
                    aria-hidden={!open}
                    className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isCurrent(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex w-full items-center rounded-md px-3 py-2 text-sm ${childActive ? 'font-semibold text-black' : 'text-neutral-700 hover:bg-neutral-100'}`}
                            >
                              <ChildIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="shrink-0 border-t border-neutral-200 px-4 py-4">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-neutral-500">{ROLES[user.role]}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold"
              onClick={() => {
                clearSession();
                router.replace('/login');
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 xl:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <main className="min-h-dvh min-w-0 px-4 pb-8 pt-[4.5rem] xl:ml-64 xl:px-8 xl:pt-8">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ title, text }: { title: string; text?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-3xl">{title}</h1>
      {text ? <p className="mt-2 max-w-2xl text-neutral-600">{text}</p> : null}
    </header>
  );
}

export const inputClass =
  'h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-black';

export function Notice({ error }: { error: string }) {
  if (!error) return null;
  return <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-600">{error}</p>;
}
