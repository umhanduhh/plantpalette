'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LogoMark from './components/LogoMark';
import ColorWheel from './components/ColorWheel';
import { PLANT_COLOR_HEX, PlantColorKey } from '@/lib/plant-colors';
import { NUTRIENT_INFO } from '@/lib/nutrient-info';

type DemoFood = [name: string, color: PlantColorKey | null, nutrient: string, day: number];

// A fixed script for the self-running "live demo" on the hero. Decorative
// only — touches no real data. Nutrient names must match keys produced by
// NUTRIENT_INFO below.
const DEMO_FOODS: DemoFood[] = [
  ['Strawberries', 'red', 'Vitamin C', 0],
  ['Sweet potato', 'orange', 'Vitamin A', 0],
  ['Chickpeas', null, 'Fiber', 0],
  ['Kale', 'green', 'Vitamin K', 1],
  ['Blueberries', 'blue', 'Fiber', 1],
  ['Red cabbage', 'purple', 'Vitamin C', 1],
  ['Lemon', 'yellow', 'Vitamin C', 2],
  ['Black beans', null, 'Folate', 2],
  ['Avocado', 'green', 'Potassium', 3],
  ['Beets', 'red', 'Folate', 3],
  ['Carrots', 'orange', 'Vitamin A', 3],
  ['Almonds', null, 'Magnesium', 4],
  ['Broccoli', 'green', 'Vitamin C', 4],
  ['Plums', 'purple', 'Fiber', 4],
  ['Quinoa', null, 'Magnesium', 5],
  ['Mango', 'orange', 'Vitamin A', 5],
  ['Spinach', 'green', 'Iron', 5],
  ['Blackberries', 'purple', 'Fiber', 6],
  ['Pumpkin seeds', null, 'Magnesium', 6],
  ['Bell pepper', 'red', 'Vitamin C', 6],
];
const DEMO_GOAL = DEMO_FOODS.length;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const NUTRIENT_EXPLANATIONS: Record<string, string> = Object.fromEntries(
  Object.values(NUTRIENT_INFO).map(({ name, explanation }) => [name, explanation])
);

// Drives the demo's step count on a single self-correcting timer. The next
// delay is computed from a ref rather than from state read after setState,
// since React may not have re-rendered by the time the following line runs.
function useDemoStep(total: number) {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stepRef.current = total;
      setStep(total);
      return;
    }

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (ms: number) => {
      timer = setTimeout(tick, ms);
    };
    const tick = () => {
      if (!alive) return;
      const next = stepRef.current >= total ? 0 : stepRef.current + 1;
      stepRef.current = next;
      setStep(next);
      schedule(next >= total ? 2800 : 850);
    };
    schedule(700);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [total]);

  return step;
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const demoStep = useDemoStep(DEMO_GOAL);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });
  }, []);

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

  const addedFoods = DEMO_FOODS.slice(0, demoStep);
  const colorCounts = addedFoods.reduce<Partial<Record<PlantColorKey, number>>>((acc, [, color]) => {
    if (color) acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});
  const activeDays = new Set(addedFoods.map(([, , , day]) => day));
  const visibleChips = addedFoods.slice(-6);
  const lastFood = addedFoods[addedFoods.length - 1];
  const nutrientName = lastFood ? lastFood[2] : 'Vitamin C';
  const nutrientDotColor = lastFood && lastFood[1] ? PLANT_COLOR_HEX[lastFood[1]] : '#c9c2b4';
  const goalMet = demoStep >= DEMO_GOAL;

  return (
    <div
      className="min-h-screen flex justify-center font-[family-name:var(--font-poppins)]"
      style={{
        padding: '28px 16px 32px',
        background: 'radial-gradient(560px 420px at 50% -6%, #fdf7ee 0%, var(--canvas) 62%)',
      }}
    >
      <div className="w-full flex flex-col" style={{ maxWidth: 420, gap: 20 }}>
        {/* Wordmark */}
        <div className="flex items-center justify-center" style={{ gap: 10 }}>
          <LogoMark size={34} />
          <span
            className="font-[family-name:var(--font-playfair)] font-bold"
            style={{ fontSize: 19, color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            Plate Palette
          </span>
        </div>

        {/* Hero copy */}
        <div className="text-center">
          <h1
            className="font-[family-name:var(--font-playfair)] font-black"
            style={{
              fontSize: 40,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color: 'var(--primary-magenta)',
              marginBottom: 14,
              textWrap: 'balance',
            }}
          >
            Track colorful, nutrient‑dense foods each week
          </h1>
          <p className="font-medium" style={{ fontSize: 17, color: 'var(--body-text)', marginBottom: 10 }}>
            Celebrate variety and nutrition science
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', textWrap: 'pretty' }}>
            Plate Palette helps you log the plant-based foods you eat, see your variety
            mapped across a color wheel, hit a weekly goal, and share your progress with friends.
          </p>
        </div>

        {/* Live demo card */}
        <div className="pp-card flex flex-col" style={{ padding: '20px 18px 18px', gap: 16 }}>
          <div className="flex items-center justify-between">
            <span className="pp-eyebrow" style={{ color: 'var(--muted)', fontWeight: 700 }}>
              Your weekly variety
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--fresh-green)',
              }}
            >
              Live demo
            </span>
          </div>

          <div className="pp-demo-wheel">
            <ColorWheel
              count={demoStep}
              label={`/ ${DEMO_GOAL} foods`}
              size={196}
              ring={30}
              colorCounts={colorCounts}
              goal={DEMO_GOAL}
            />
          </div>

          <div className="flex justify-between" style={{ gap: 6 }}>
            {DAY_LABELS.map((label, i) => {
              const active = activeDays.has(i);
              return (
                <div
                  key={label}
                  className="flex items-center justify-center"
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: '50%',
                    fontSize: 11.5,
                    fontWeight: 600,
                    transition: 'all .35s',
                    background: active ? 'var(--grad-primary)' : 'var(--wheel-empty)',
                    color: active ? '#fff' : 'var(--faint)',
                    boxShadow: active ? '0 4px 10px rgba(76,201,240,.3)' : 'none',
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap" style={{ gap: 7, minHeight: 74, alignContent: 'flex-start' }}>
            {visibleChips.map(([name, color], i) => (
              <span key={`${name}-${i}`} className="pp-chip">
                <span className="pp-chip-dot" style={{ background: color ? PLANT_COLOR_HEX[color] : '#d8d2c5' }} />
                {name}
              </span>
            ))}
          </div>

          {goalMet && (
            <div
              className="text-center font-semibold"
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--r-btn)',
                background: 'var(--surface-soft)',
                border: '1px solid var(--border-warm)',
                color: 'var(--fresh-green)',
                fontSize: 14,
              }}
            >
              You did it! You’ve reached your weekly goal. What a colorful week of eating!
            </div>
          )}

          <div
            style={{
              background: 'var(--surface-soft)',
              border: '1px solid var(--border-warm)',
              borderRadius: 'var(--r-btn)',
              padding: '14px 16px',
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: nutrientDotColor }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                {nutrientName}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--chip-text)', textWrap: 'pretty' }}>
              {NUTRIENT_EXPLANATIONS[nutrientName]}
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--r-sheet)',
            border: '1px solid var(--border-warm)',
            boxShadow: '0 18px 48px rgba(26,26,26,.13)',
            padding: '26px 22px 24px',
          }}
        >
          <h2
            className="font-[family-name:var(--font-playfair)] font-bold text-center"
            style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}
          >
            Get Started
          </h2>
          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            Free. No password needed.
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 font-semibold transition-colors disabled:opacity-50 hover:bg-[var(--surface-chip)] hover:shadow-[0_6px_18px_rgba(0,0,0,.06)]"
            style={{
              minHeight: 52,
              borderRadius: 'var(--r-btn)',
              background: 'var(--surface)',
              border: '1px solid var(--border-warm)',
              color: 'var(--ink)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
          <p className="text-center" style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.5, marginTop: 8 }}>
            We use your Google name, email, and profile photo to create your account.
            We never access your Gmail or Drive. See our{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>

          {/* Divider */}
          <div className="flex items-center" style={{ gap: 12, margin: '18px 0' }}>
            <div className="flex-1 h-px" style={{ background: 'var(--border-warm)' }} />
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-warm)' }} />
          </div>

          <form onSubmit={handleSignIn} className="flex flex-col" style={{ gap: 14 }}>
            <div>
              <label htmlFor="email" className="block font-semibold" style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>
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
                style={{ minHeight: 52, fontSize: 16 }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pp-btn-primary w-full"
              style={{ minHeight: 56, fontSize: 17 }}
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

          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
            We'll send you a confirmation link to sign in. No password needed!
          </p>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center" style={{ gap: 12, fontSize: 12, color: 'var(--faint)' }}>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </div>

      <style jsx>{`
        .pp-demo-wheel > div {
          transition: background 0.55s ease;
        }
      `}</style>
    </div>
  );
}
