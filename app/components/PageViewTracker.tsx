'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      // keepalive lets this survive an immediate navigation away.
      fetch('/api/track/pageview', {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      }).catch(() => {});
    })();
  }, [pathname]);

  return null;
}
