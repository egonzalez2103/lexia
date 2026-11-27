export const PALETAS = [
  { id: 'negro', nombre: 'Negro' },
  { id: 'tinta', nombre: 'Tinta' },
  { id: 'bosque', nombre: 'Bosque' },
  { id: 'vino', nombre: 'Vino' },
  { id: 'marino', nombre: 'Marino' },
  { id: 'piedra', nombre: 'Piedra' },
] as const;

export const PALETA_IDS = PALETAS.map((paleta) => paleta.id);

export function nombrePaleta(id: string | null | undefined) {
  return PALETAS.find((paleta) => paleta.id === id)?.nombre ?? 'Negro';
}
