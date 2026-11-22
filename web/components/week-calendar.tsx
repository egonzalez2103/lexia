'use client';

import { useState } from 'react';
import { addDays, fromISO, mondayOf, toISO, weeksOfMonth } from '@/lib/week';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function WeekCalendar({ value, onChange }: { value: string; onChange: (monday: string) => void }) {
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromISO(value) : mondayOf(new Date());
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const weeks = weeksOfMonth(view.getFullYear(), view.getMonth());
  const title = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(view);

  return (
    <div className="w-full max-w-sm border border-neutral-200 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="h-8 px-2 text-sm"
          aria-label="Mes anterior"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <p className="text-sm font-medium capitalize">{title}</p>
        <button
          type="button"
          className="h-8 px-2 text-sm"
          aria-label="Mes siguiente"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 pb-1 text-center text-xs text-neutral-500">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid gap-1">
        {weeks.map((week) => {
          const monday = mondayOf(week[0]);
          const iso = toISO(monday);
          const active = iso === toISO(selected);
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={active}
              aria-label={`Semana del ${iso} al ${toISO(addDays(monday, 6))}`}
              onClick={() => onChange(iso)}
              className={`grid grid-cols-7 rounded-md py-1 text-center text-sm ${active ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
            >
              {week.map((day) => {
                const outside = day.getMonth() !== view.getMonth();
                return (
                  <span key={toISO(day)} className={outside ? (active ? 'text-white/60' : 'text-neutral-400') : undefined}>
                    {day.getDate()}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
