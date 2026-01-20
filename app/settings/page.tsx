'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
          weekly_goal: weeklyGoal,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (error) throw error;

      setMessage('Settings saved successfully!');

      // Update local state
      if (user) {
        setUser({ ...user, first_name: firstName.trim() || undefined, weekly_goal: weeklyGoal });
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg font-poppins text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 font-[family-name:var(--font-poppins)]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mr-4 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
            Settings
          </h1>
        </div>

        {/* Profile Settings */}
        <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            Profile
          </h2>
          <form onSubmit={handleSaveProfile}>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d4006f] focus:outline-none transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This is how your friends will see you
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <p className="text-gray-600 px-4 py-3 bg-white rounded-xl">{user?.email}</p>
              </div>

              <div>
                <label htmlFor="weeklyGoal" className="block text-sm font-semibold text-gray-700 mb-2">
                  Weekly Goal
                </label>
                <input
                  id="weeklyGoal"
                  type="number"
                  min="5"
                  max="100"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 20)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d4006f] focus:outline-none transition-colors text-lg font-semibold"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Number of unique plant foods per week (5-100)
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#52b788' }}
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
        <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            About
          </h2>
          <div className="space-y-2 text-gray-600">
            <p>
              <span className="font-semibold">Plate Palette</span> helps you track the variety of plant-based foods you eat each week.
            </p>
            <p className="text-sm text-gray-500 mt-4">
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
