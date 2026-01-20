'use client';

import { useState } from 'react';
import { FoodLog, formatLocalDate } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import NutritionInfoCard from './NutritionInfoCard';

interface WeeklyHistoryProps {
  foodLogs: FoodLog[];
  weekStartDate: string;
  weekEndDate: string;
  onFoodDeleted: () => void;
}

export default function WeeklyHistory({ foodLogs, weekStartDate, weekEndDate, onFoodDeleted }: WeeklyHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodLog | null>(null);

  // Group foods by day
  const groupedByDay: Record<string, FoodLog[]> = {};
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize all days
  const [year, month, day] = weekStartDate.split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    const date = new Date(year, month - 1, day + i);
    const dateStr = formatLocalDate(date);
    groupedByDay[dateStr] = [];
  }

  // Group logs by date
  foodLogs.forEach(log => {
    if (groupedByDay[log.logged_date]) {
      groupedByDay[log.logged_date].push(log);
    }
  });

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      setShowDeleteConfirm(null);
      onFoodDeleted();
    } catch (err) {
      console.error('Error deleting food:', err);
      alert('Failed to delete food. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  const sortedDates = Object.keys(groupedByDay).sort();

  if (foodLogs.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
        This Week's Foods
      </h3>

      <div className="space-y-4">
        {sortedDates.map((dateStr, index) => {
          const logs = groupedByDay[dateStr];
          const [y, m, d] = dateStr.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          const dayName = weekDays[index];
          const todayStr = formatLocalDate(new Date());
          const isToday = dateStr === todayStr;

          if (logs.length === 0) return null;

          return (
            <div key={dateStr} className="bg-gray-50 rounded-xl p-4">
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {dayName}
                    {isToday && (
                      <span className="ml-2 text-sm font-normal px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#ff6b35' }}>
                        Today
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-sm font-semibold" style={{ color: '#4cc9f0' }}>
                  {logs.length} {logs.length === 1 ? 'food' : 'foods'}
                </div>
              </div>

              {/* Foods List */}
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white rounded-lg p-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedFood(log)}
                      className="flex-1 text-left hover:opacity-70 transition-opacity"
                    >
                      <p className="font-medium text-gray-900">{log.food_name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.logged_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </button>

                    {/* Delete X Button - Always Visible */}
                    <button
                      onClick={() => setShowDeleteConfirm(log.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xl leading-none font-bold w-8 h-8 flex items-center justify-center flex-shrink-0"
                      disabled={deletingId === log.id}
                      aria-label="Delete food"
                    >
                      ×
                    </button>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm === log.id && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                          <h3 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-2" style={{ color: '#d4006f' }}>
                            Delete this food?
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Remove <span className="font-semibold">{log.food_name}</span> from your log?
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              disabled={deletingId === log.id}
                              className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(log.id)}
                              disabled={deletingId === log.id}
                              className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: '#ff6b35' }}
                            >
                              {deletingId === log.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nutrition Info Card */}
      <NutritionInfoCard
        food={selectedFood}
        onClose={() => setSelectedFood(null)}
      />
    </div>
  );
}
