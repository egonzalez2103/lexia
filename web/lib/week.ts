export function fromISO(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toISO(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function mondayOf(date: Date) {
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(date, delta);
}

export function currentMonday() {
  const today = new Date();
  return toISO(mondayOf(new Date(today.getFullYear(), today.getMonth(), today.getDate())));
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function etiquetaSemana(inicio: string, fin?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return inicio;
  const desde = fromISO(inicio);
  const hasta = fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) ? fromISO(fin) : addDays(desde, 6);
  const texto = (date: Date) =>
    `${DIAS[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  return `${texto(desde)} – ${texto(hasta)}`;
}

export function formatWeek(periodo: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return periodo;
  const monday = fromISO(periodo);
  const sunday = addDays(monday, 6);
  const start = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(monday);
  const end = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(sunday);
  return `${start} – ${end}`;
}

export function weeksOfMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  let cursor = mondayOf(first);
  const last = new Date(year, month + 1, 0);
  const end = addDays(mondayOf(last), 6);
  const weeks: Date[][] = [];
  while (cursor.getTime() <= end.getTime()) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
