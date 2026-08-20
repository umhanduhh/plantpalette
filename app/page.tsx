'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });
  }, []);

  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/oauth/consent`,
        },
      });

      if (error) throw error;
      // On success the browser is redirected to Google; nothing else to do here.
    } catch (error: any) {
      setMessage(error.message || 'Something went wrong');
      setGoogleLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setMessage('Check your email for the confirmation link!');
      setEmail('');
    } catch (error: any) {
      setMessage(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            Plate Palette
          </h1>
          <p className="text-xl mb-2" style={{ color: 'var(--body-text)' }}>
            Track colorful, nutrient-dense foods each week
          </p>
          <p style={{ color: 'var(--muted)' }}>
            Celebrate variety and nutrition science
          </p>
        </div>

        {/* Sign In Card */}
        <div className="pp-card p-8">
          <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold mb-6 text-center" style={{ color: 'var(--ink)' }}>
            Get Started
          </h2>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-warm)', color: 'var(--ink)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-warm)' }} />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-warm)' }} />
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pp-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pp-btn-primary w-full text-lg"
            >
              {loading ? 'Sending...' : 'Send Confirmation Link'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-xl text-center ${
              message.includes('Check your email') || message.includes('confirmation link')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <p className="mt-6 text-sm text-center" style={{ color: 'var(--muted)' }}>
            We'll send you a confirmation link to sign in. No password needed!
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl mb-2">🌈</div>
            <p className="text-sm font-semibold" style={{ color: 'var(--body-text)' }}>Colorful Variety</p>
          </div>
          <div>
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm font-semibold" style={{ color: 'var(--body-text)' }}>Track Progress</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm font-semibold" style={{ color: 'var(--body-text)' }}>Learn Nutrition</p>
          </div>
        </div>
      </div>
    </div>
  );
}
