export type Paleta = {
  id: string;
  nombre: string;
  fondo: string;
  tinta: string;
  acento: string;
  acentoTexto: string;
  suave: string;
  linea: string;
  muted: string;
};

export const PALETAS: Paleta[] = [
  { id: 'negro', nombre: 'Negro', fondo: '#ffffff', tinta: '#111111', acento: '#111111', acentoTexto: '#ffffff', suave: '#f5f5f5', linea: '#e5e5e5', muted: '#737373' },
  { id: 'tinta', nombre: 'Tinta', fondo: '#f7f4ef', tinta: '#1c2430', acento: '#1e3a5f', acentoTexto: '#f7f4ef', suave: '#efe8dc', linea: '#e2d8c8', muted: '#6d6458' },
  { id: 'bosque', nombre: 'Bosque', fondo: '#f4f7f4', tinta: '#14211b', acento: '#1f4d3a', acentoTexto: '#f4f7f4', suave: '#e4eee6', linea: '#d3e0d6', muted: '#5d6e64' },
  { id: 'vino', nombre: 'Vino', fondo: '#fbf6f4', tinta: '#2a1618', acento: '#6e2430', acentoTexto: '#fbf6f4', suave: '#f3e6e4', linea: '#ead5d2', muted: '#8a6568' },
  { id: 'marino', nombre: 'Marino', fondo: '#f4f7fb', tinta: '#102033', acento: '#0f3d68', acentoTexto: '#f4f7fb', suave: '#e4edf6', linea: '#d3e0ee', muted: '#5d7084' },
  { id: 'piedra', nombre: 'Piedra', fondo: '#f6f5f3', tinta: '#2b2926', acento: '#8a7355', acentoTexto: '#ffffff', suave: '#eeeae4', linea: '#e0d9cf', muted: '#7a736a' },
];

export function paletaDe(id: string | null | undefined) {
  return PALETAS.find((paleta) => paleta.id === id) ?? PALETAS[0];
}
