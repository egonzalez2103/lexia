'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn, TriangleAlert } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { homeFor, readSession, saveSession, type Session } from '@/lib/session';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) router.replace(homeFor(session.user));
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await api<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(session);
      router.replace(homeFor(session.user));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No pudimos entrar.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="min-w-0 space-y-2">
      <input
        type="text"
        autoComplete="username"
        required
        disabled={loading}
        placeholder="Correo o usuario"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="flex h-9 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 text-base shadow-sm outline-none placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
      />
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          minLength={8}
          disabled={loading}
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="flex h-9 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 pr-10 text-base shadow-sm outline-none placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
        />
        <button
          type="button"
          className="absolute right-0 top-0 flex h-full items-center px-3 text-neutral-500 hover:bg-transparent"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setShowPassword((value) => !value)}
          disabled={loading}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="ml-auto w-fit">
        <Link href="/recuperar">
          <h6 className="mb-2 cursor-pointer text-sm font-medium text-black transition-colors hover:underline">
            ¿Olvidaste tu contraseña?
          </h6>
        </Link>
      </div>
      {error ? (
        <div className="flex items-center gap-x-2 rounded-md bg-red-500/15 p-3 text-sm text-red-500">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-9 w-full items-center justify-center rounded-none bg-black text-sm font-medium text-white shadow hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Ingresar
          </>
        )}
      </button>
    </form>
  );
}
