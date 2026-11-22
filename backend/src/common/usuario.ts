export function foldUsuario(valor: string) {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Primer nombre + punto + apellido paterno. Rubén Campos → ruben.campos. */
export function baseNombreUsuario(nombre?: string | null, paterno?: string | null) {
  const primerNombre = foldUsuario(nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)[0]
    ?.replace(/[^a-z]/g, '');
  const apellido = foldUsuario(paterno ?? '').replace(/[^a-z]/g, '');
  if (!primerNombre || !apellido) return null;
  return `${primerNombre}.${apellido}`;
}

export function siguienteNombreUsuario(base: string, ocupados: Set<string>) {
  if (!ocupados.has(base)) return base;
  let n = 1;
  while (ocupados.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}
