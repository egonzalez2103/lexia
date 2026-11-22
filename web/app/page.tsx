'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor, readSession } from '@/lib/session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    router.replace(session ? homeFor(session.user) : '/login');
  }, [router]);

  return null;
}
