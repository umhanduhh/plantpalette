'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * OAuth redirect target. Supabase sends the user here after the provider's
 * consent screen (this is the `redirectTo` passed to signInWithOAuth). It
 * finalizes the session — from either the implicit-flow URL fragment
 * (#access_token=…) or a PKCE `?code=` — then routes to the dashboard.
 */
export default function OAuthConsent() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorDescription = url.searchParams.get('error_description');

        if (errorDescription) {
          console.error('OAuth provider error:', errorDescription);
          router.push('/auth/error');
          return;
        }

        const hash = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');

        if (accessToken && refreshToken) {
          // Implicit flow — tokens arrive in the URL fragment.
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          // PKCE flow — exchange the authorization code for a session.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/dashboard');
        } else {
          router.push('/auth/error');
        }
      } catch (err) {
        console.error('OAuth consent error:', err);
        router.push('/auth/error');
      }
    };

    finalize();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-lg" style={{ color: 'var(--body-text)' }}>Completing sign in...</p>
      </div>
    </div>
  );
}
