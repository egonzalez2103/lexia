export function Mark({ className = 'h-16 w-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="4" fill="none" stroke="#111111" strokeWidth="1.5" />
      <path d="M18 16h28v7H34v16c0 6.2-3.4 10-10 10h-2v-7h2c2.6 0 4-1.6 4-4V23H18V16Z" fill="#111111" />
    </svg>
  );
}
