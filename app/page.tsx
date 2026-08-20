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

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
