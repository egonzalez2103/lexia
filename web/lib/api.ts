import { readSession } from './session';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return `${base}${path}`;
}

export async function api<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (auth) {
    const session = readSession();
    if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(apiUrl(path), { ...init, headers });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { message?: string | string[] }) : {};
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(message || 'No pudimos completar la solicitud.');
  }
  return data as T;
}

export function fileHref(path: string | null | undefined) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return apiUrl(path);
}

export async function uploadArchivo(file: File) {
  const session = readSession();
  const body = new FormData();
  body.append('archivo', file);
  const headers = new Headers();
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(apiUrl('/uploads'), { method: 'POST', body, headers });
  const data = (await response.json()) as { url?: string; message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(message || 'No pudimos subir el archivo.');
  }
  return data.url ?? '';
}
