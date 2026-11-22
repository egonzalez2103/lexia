const RESERVED = new Set(['www', 'api', 'admin', 'login', 'panel', 'app', 'juridico', 'sitio', 'despacho']);

export function normalizeSlug(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (slug.length < 3 || RESERVED.has(slug)) {
    return '';
  }
  return slug;
}

export function money(value: string | number | null | undefined) {
  return Number(value ?? 0);
}
