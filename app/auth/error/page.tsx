'use client';

import { useRouter } from 'next/navigation';

export default function AuthError() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-md w-full text-center">
        <div className="pp-card p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Authentication Error
          </h1>
          <p className="mb-6" style={{ color: 'var(--body-text)' }}>
            Something went wrong with your login. The link may have expired or already been used.
          </p>
          <button
            onClick={() => router.push('/')}
            className="pp-btn-primary w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
