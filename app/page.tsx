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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-orange-50 to-blue-50 px-4 font-[family-name:var(--font-poppins)]">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            Plate Palette
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Track colorful, nutrient-dense foods each week
          </p>
          <p className="text-gray-500">
            Celebrate variety and nutrition science
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold mb-6 text-center" style={{ color: '#ff6b35' }}>
            Get Started
          </h2>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d4006f] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
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

          <p className="mt-6 text-sm text-gray-500 text-center">
            We'll send you a confirmation link to sign in. No password needed!
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl mb-2">🌈</div>
            <p className="text-sm text-gray-600 font-semibold">Colorful Variety</p>
          </div>
          <div>
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-600 font-semibold">Track Progress</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm text-gray-600 font-semibold">Learn Nutrition</p>
          </div>
        </div>
      </div>
    </div>
  );
}
