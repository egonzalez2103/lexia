'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IniciosCajaPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/panel/movimientos/cortes');
  }, [router]);
  return null;
}
