'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeekDates } from '@/lib/types';

const RAINBOW = '🌈';

interface FeedRow {
  user_id: string;
  display_name: string;
  weekly_unique_count: number;
  weekly_goal: number;
  recent_foods: string[] | null;
  last_logged_at: string;
  rainbow_count: number;
  viewer_has_rainbowed: boolean;
}

export default function NewsfeedPage() {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates();

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFeed() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = '/';
        return;
      }
      setCurrentUserId(authUser.id);

      const { data, error } = await supabase.rpc('get_newsfeed', {
        p_week_start: weekDates.week_starting_date,
        p_week_end: weekDates.week_ending_date,
      });

      if (error) {
        console.error('Error loading newsfeed:', error);
      } else if (data) {
        setRows(data as FeedRow[]);
      }
    } catch (error) {
      console.error('Error loading newsfeed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRainbow(row: FeedRow) {
    if (!currentUserId) return;

    const adding = !row.viewer_has_rainbowed;

    // Optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.user_id === row.user_id
          ? {
              ...r,
              viewer_has_rainbowed: adding,
              rainbow_count: r.rainbow_count + (adding ? 1 : -1),
            }
          : r
      )
    );

    try {
      if (adding) {
        const { error } = await supabase.from('weekly_reactions').upsert(
          {
            from_user_id: currentUserId,
            to_user_id: row.user_id,
            week_starting_date: weekDates.week_starting_date,
            emoji: RAINBOW,
          },
          { onConflict: 'from_user_id,to_user_id,week_starting_date' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weekly_reactions')
          .delete()
          .eq('from_user_id', currentUserId)
          .eq('to_user_id', row.user_id)
          .eq('week_starting_date', weekDates.week_starting_date);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Roll back on failure
      setRows((prev) =>
        prev.map((r) =>
          r.user_id === row.user_id
            ? {
                ...r,
                viewer_has_rainbowed: !adding,
                rainbow_count: r.rainbow_count + (adding ? -1 : 1),
              }
            : r
        )
      );
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
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
            Community
          </h1>
          <a
            href="/dashboard"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#4cc9f0' }}
          >
            ← Back to Dashboard
          </a>
        </header>

        {rows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-xl text-gray-500 mb-2">No activity yet this week</p>
            <p className="text-gray-400">
              When people log foods, they&apos;ll show up here. Add your name in
              Settings to join in!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const progressPercent = Math.min(
                (row.weekly_unique_count / row.weekly_goal) * 100,
                100
              );
              const isSelf = row.user_id === currentUserId;

              return (
                <div
                  key={row.user_id}
                  className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {row.display_name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-semibold text-gray-400">
                            (you)
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {row.weekly_unique_count} / {row.weekly_goal} foods this week
                      </p>
                    </div>

                    {/* Rainbow reaction */}
                    <button
                      onClick={() => toggleRainbow(row)}
                      disabled={isSelf}
                      className={`flex items-center gap-1 px-3 py-2 rounded-full transition-all ${
                        isSelf
                          ? 'opacity-40 cursor-default'
                          : row.viewer_has_rainbowed
                          ? 'bg-pink-50 hover:bg-pink-100'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      aria-label="Send a rainbow"
                      title={isSelf ? 'This is you' : 'Send a rainbow'}
                    >
                      <span
                        className={`text-xl transition-transform ${
                          row.viewer_has_rainbowed ? 'scale-110' : 'grayscale'
                        }`}
                      >
                        {RAINBOW}
                      </span>
                      {row.rainbow_count > 0 && (
                        <span className="text-sm font-semibold text-gray-600">
                          {row.rainbow_count}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #52b788 0%, #4cc9f0 100%)',
                      }}
                    />
                  </div>

                  {/* Recent foods */}
                  {row.recent_foods && row.recent_foods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {row.recent_foods.map((food, i) => (
                        <span
                          key={`${row.user_id}-${i}`}
                          className="text-xs font-medium px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
