'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthConfirm() {
  const router = useRouter();

  useEffect(() => {
    // Handle the auth callback on the client side
    const handleAuth = async () => {
      try {
        // Check if we have a hash (from the URL fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            router.push('/auth/error');
            return;
          }

          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          // No tokens in hash, redirect to error
          router.push('/auth/error');
        }
      } catch (err) {
        console.error('Auth confirm error:', err);
        router.push('/auth/error');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-lg text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
