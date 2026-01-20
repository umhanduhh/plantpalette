'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FoodLog, User, getWeekDates, formatLocalDate } from '@/lib/types';
import AddFoodModal from '../components/AddFoodModal';
import WeeklyHistory from '../components/WeeklyHistory';
import ShareCard from '../components/ShareCard';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);

  const weekDates = getWeekDates();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    loadUserAndFoods();
  }, []);

  async function loadUserAndFoods() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = '/';
        return;
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUser(userData);
      }

      // Get food logs for current week
      console.log('Querying food logs for week:', weekDates.week_starting_date, 'to', weekDates.week_ending_date);
      const { data: logs, error: logsError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('logged_date', weekDates.week_starting_date)
        .lte('logged_date', weekDates.week_ending_date)
        .order('logged_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      }

      if (logs) {
        console.log('Found', logs.length, 'food logs for this week');
        console.log('Food logs:', logs.map(log => ({ name: log.food_name, date: log.logged_date })));
        setFoodLogs(logs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Count unique foods this week
  const uniqueFoodIds = new Set(foodLogs.map(log => log.fdc_id));
  const uniqueFoodsCount = uniqueFoodIds.size;
  const weeklyGoal = user?.weekly_goal || 20;
  const progressPercent = Math.min((uniqueFoodsCount / weeklyGoal) * 100, 100);
  const goalMet = uniqueFoodsCount >= weeklyGoal;

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
          <div>
            <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold mb-2" style={{ color: '#d4006f' }}>
              Plate Palette
            </h1>
            <p className="text-gray-600">
              Week of {new Date(weekDates.week_starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weekDates.week_ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/friends"
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Friends"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#52b788' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </a>
            <a
              href="/settings"
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#d4006f' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
          </div>
        </header>

        {/* Progress Section */}
        <div className="mb-8 p-6 bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl shadow-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold mb-1" style={{ color: '#d4006f' }}>
              Your Weekly Variety
            </h2>
            <p className="text-3xl font-bold mb-4" style={{ color: '#ff6b35' }}>
              {uniqueFoodsCount} / {weeklyGoal} foods
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-6 bg-white rounded-full overflow-hidden shadow-inner mb-4">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #d4006f 0%, #ff6b35 50%, #52b788 100%)',
              }}
            />
          </div>

          {/* Days of Week Indicators */}
          <div className="flex justify-between mb-4">
            {weekDays.map((day, index) => {
              const [year, month, dayOfMonth] = weekDates.week_starting_date.split('-').map(Number);
              const date = new Date(year, month - 1, dayOfMonth + index);
              const dateStr = formatLocalDate(date);
              const hasLogs = foodLogs.some(log => log.logged_date === dateStr);

              return (
                <div key={day} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                      hasLogs ? 'shadow-md' : 'bg-gray-100'
                    }`}
                    style={hasLogs ? { background: 'linear-gradient(135deg, #4cc9f0, #52b788)' } : {}}
                  >
                    <span className={`text-sm font-semibold ${hasLogs ? 'text-white' : 'text-gray-400'}`}>
                      {day}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Celebration Message */}
          {goalMet && (
            <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
              <p className="text-lg font-semibold text-center" style={{ color: '#52b788' }}>
                You did it! You've reached your weekly goal. What a colorful week of eating!
              </p>
            </div>
          )}
        </div>

        {/* Share Card */}
        {user && (
          <ShareCard
            user={user}
            foodLogs={foodLogs}
            uniqueFoodsCount={uniqueFoodsCount}
            weekStartDate={weekDates.week_starting_date}
            weekEndDate={weekDates.week_ending_date}
          />
        )}

        {/* Add Food Button */}
        <button
          onClick={() => setShowAddFoodModal(true)}
          className="w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg hover:shadow-xl transition-all mb-8"
          style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
        >
          + Add a Food
        </button>

        {/* Weekly History */}
        <WeeklyHistory
          foodLogs={foodLogs}
          weekStartDate={weekDates.week_starting_date}
          weekEndDate={weekDates.week_ending_date}
          onFoodDeleted={loadUserAndFoods}
        />

        {/* Empty State */}
        {foodLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500 mb-4">No foods logged this week yet.</p>
            <p className="text-gray-400">Start adding variety to your plate!</p>
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      <AddFoodModal
        isOpen={showAddFoodModal}
        onClose={() => setShowAddFoodModal(false)}
        onFoodAdded={loadUserAndFoods}
      />
    </div>
  );
}
