'use client';

import { useRouter } from 'next/navigation';

export default function AuthError() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-orange-50 to-blue-50 px-4 font-[family-name:var(--font-poppins)]">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-6">
            Something went wrong with your login. The link may have expired or already been used.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
