'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GruposRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/panel/administracion/permisos');
  }, [router]);
  return null;
}
