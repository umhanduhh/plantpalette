'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#')
            ? window.location.hash.substring(1)
            : window.location.hash
        );

        // Surface an explicit error from Supabase, if present.
        const errorDescription =
          params.get('error_description') || hashParams.get('error_description');
        if (errorDescription) {
          console.error('[v0] Auth callback error:', errorDescription);
          router.replace('/auth/error');
          return;
        }

        // 1) PKCE flow: ?code=...
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.replace('/dashboard');
          return;
        }

        // 2) Token-hash flow: ?token_hash=...&type=...
        const tokenHash = params.get('token_hash') || params.get('token');
        const type = params.get('type');
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) throw error;
          router.replace('/dashboard');
          return;
        }

        // 3) Implicit flow: #access_token=...&refresh_token=...
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          router.replace('/dashboard');
          return;
        }

        // 4) detectSessionInUrl may have already established the session.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace('/dashboard');
          return;
        }

        console.error('[v0] Auth callback: no recognizable auth parameters');
        router.replace('/auth/error');
      } catch (err: any) {
        console.error('[v0] Auth callback failed:', err?.message ?? err);
        router.replace('/auth/error');
      }
    };

    completeSignIn();
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--canvas)' }}
    >
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-lg" style={{ color: 'var(--body-text)' }}>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
