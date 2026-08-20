'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const nameIncomplete = !firstName.trim() || !lastName.trim();

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = '/';
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUser(userData);
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
        setWeeklyGoal(userData.weekly_goal);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (weeklyGoal < 5 || weeklyGoal > 100) {
      setMessage('Goal must be between 5 and 100');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          weekly_goal: weeklyGoal,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (error) throw error;

      setMessage('Settings saved successfully!');

      // Update local state
      if (user) {
        setUser({
          ...user,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          weekly_goal: weeklyGoal,
        });
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      setMessage(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="text-lg font-poppins" style={{ color: 'var(--body-text)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mr-4"
            style={{ color: 'var(--faint)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: 'var(--ink)' }}>
            Settings
          </h1>
        </div>

        {/* Real-name encouragement banner */}
        {nameIncomplete && !bannerDismissed && (
          <div className="mb-8 p-4 rounded-2xl flex items-start justify-between gap-4" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-warm)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌈</span>
              <p className="text-sm" style={{ color: 'var(--body-text)' }}>
                Add your <span className="font-semibold">real first and last name</span> to show up
                in the community newsfeed and cheer on other eaters. You&apos;ll appear as{' '}
                <span className="font-semibold">First L.</span> — never your full last name or email.
              </p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-xl leading-none flex-shrink-0"
              style={{ color: 'var(--faint)' }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Profile Settings */}
        <div className="pp-card mb-8 p-6">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Profile
          </h2>
          <form onSubmit={handleSaveProfile}>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pp-input"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pp-input"
                  />
                </div>
              </div>
              <p className="text-sm -mt-2" style={{ color: 'var(--muted)' }}>
                Your name appears in the community newsfeed as{' '}
                <span className="font-semibold">
                  {firstName.trim() ? firstName.trim() : 'First'}{' '}
                  {lastName.trim() ? lastName.trim().charAt(0).toUpperCase() + '.' : 'L.'}
                </span>
                {' '}— use your real name so friends can recognize you.
              </p>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Email</label>
                <p className="px-4 py-3 rounded-xl" style={{ color: 'var(--body-text)', background: 'var(--surface-soft)', border: '1px solid var(--border-warm)' }}>{user?.email}</p>
              </div>

              <div>
                <label htmlFor="weeklyGoal" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  Weekly Goal
                </label>
                <input
                  id="weeklyGoal"
                  type="number"
                  min="5"
                  max="100"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 20)}
                  className="pp-input text-lg font-semibold"
                />
                <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                  Number of unique plant foods per week (5-100)
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="pp-btn-primary w-full"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {message && (
              <div className={`mt-4 p-3 rounded-xl text-center ${
                message.includes('successfully')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </form>
        </div>

        {/* App Info */}
        <div className="pp-card mb-8 p-6">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: 'var(--ink)' }}>
            About
          </h2>
          <div className="space-y-2" style={{ color: 'var(--body-text)' }}>
            <p>
              <span className="font-semibold">Plate Palette</span> helps you track the variety of plant-based foods you eat each week.
            </p>
            <p className="text-sm mt-4" style={{ color: 'var(--muted)' }}>
              Version 1.0.0
            </p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl font-semibold border-2 transition-colors"
          style={{ borderColor: '#d4006f', color: '#d4006f' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
