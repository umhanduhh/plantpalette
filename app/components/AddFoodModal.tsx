'use client';

import { useState, useEffect, useRef } from 'react';
import { searchFoods } from '@/lib/usda-api';
import { USDAFood, formatLocalDate } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodAdded: () => void;
}

export default function AddFoodModal({ isOpen, onClose, onFoodAdded }: AddFoodModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<USDAFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<Set<number>>(new Set());
  const [addingFoods, setAddingFoods] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      // Debounce search by 500ms
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        performSearch();
      }, 500);
    } else {
      setSearchResults([]);
      setError('');
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery]);

  async function performSearch() {
    setLoading(true);
    setError('');

    try {
      const results = await searchFoods(searchQuery);

      if (!results.foods || results.foods.length === 0) {
        setError('No foods found. Try a different search.');
        setSearchResults([]);
      } else {
        setSearchResults(results.foods);
      }
    } catch (err: any) {
      setError(err.message || 'Hmm, couldn\'t find that. Try another search.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleFoodSelection(fdcId: number) {
    const newSelected = new Set(selectedFoods);
    if (newSelected.has(fdcId)) {
      newSelected.delete(fdcId);
    } else {
      newSelected.add(fdcId);
    }
    setSelectedFoods(newSelected);
  }

  async function handleAddSelectedFoods() {
    if (selectedFoods.size === 0) return;

    setAddingFoods(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get current week's Monday and Sunday in local timezone
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const mondayStr = formatLocalDate(monday);
      const sundayStr = formatLocalDate(sunday);

      // Get foods to add
      const foodsToAdd = searchResults.filter(food => selectedFoods.has(food.fdcId));

      // Check which foods are already logged this week
      const { data: existingLogs } = await supabase
        .from('food_logs')
        .select('fdc_id')
        .eq('user_id', user.id)
        .gte('logged_date', mondayStr)
        .lte('logged_date', sundayStr);

      const existingFdcIds = new Set(existingLogs?.map(log => log.fdc_id) || []);

      // Filter out duplicates and prepare new foods to log
      const newFoods = foodsToAdd.filter(food => !existingFdcIds.has(food.fdcId));
      const duplicates = foodsToAdd.filter(food => existingFdcIds.has(food.fdcId));

      // Add new foods
      if (newFoods.length > 0) {
        const todayStr = formatLocalDate(new Date());
        const logsToInsert = newFoods.map(food => ({
          user_id: user.id,
          fdc_id: food.fdcId,
          food_name: food.description,
          food_data_type: food.dataType,
          food_nutrients: food.foodNutrients,
          logged_date: todayStr,
          logged_at: new Date().toISOString(),
        }));

        const { error: logError } = await supabase
          .from('food_logs')
          .insert(logsToInsert);

        if (logError) throw logError;
      }

      // Show success message
      let message = '';
      if (newFoods.length > 0 && duplicates.length === 0) {
        message = `Added ${newFoods.length} food${newFoods.length > 1 ? 's' : ''}!`;
      } else if (newFoods.length > 0 && duplicates.length > 0) {
        message = `Added ${newFoods.length} new food${newFoods.length > 1 ? 's' : ''}! ${duplicates.length} already logged this week.`;
      } else {
        message = `All ${duplicates.length} food${duplicates.length > 1 ? 's were' : ' was'} already logged this week!`;
      }

      setSuccessMessage(message);
      setShowSuccess(true);
      setSelectedFoods(new Set());
      setSearchQuery('');
      setSearchResults([]);

      // Hide success message and close modal after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
        onFoodAdded();
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to add foods. Please try again.');
    } finally {
      setAddingFoods(false);
    }
  }

  function handleClose() {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSelectedFoods(new Set());
    setShowSuccess(false);
    setSuccessMessage('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Success Message */}
        {showSuccess && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-2xl font-bold mb-2" style={{ color: '#52b788' }}>
              Success!
            </p>
            <p className="text-lg text-gray-700">
              {successMessage}
            </p>
          </div>
        )}

        {/* Search Interface */}
        {!showSuccess && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
                Add Foods
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search for foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-[#d4006f] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Searching...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4">
                {error}
              </div>
            )}

            {/* Search Results with Checkboxes */}
            {!loading && searchResults.length > 0 && (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {searchResults.map((food) => (
                    <button
                      key={food.fdcId}
                      onClick={() => toggleFoodSelection(food.fdcId)}
                      className={`w-full text-left p-4 rounded-xl transition-all flex items-start gap-3 ${
                        selectedFoods.has(food.fdcId)
                          ? 'bg-green-50 border-2 border-green-400'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedFoods.has(food.fdcId)
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedFoods.has(food.fdcId) && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{food.description}</p>
                        <p className="text-sm text-gray-500 mt-1">{food.dataType}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Add Selected Button */}
                <button
                  onClick={handleAddSelectedFoods}
                  disabled={selectedFoods.size === 0 || addingFoods}
                  className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #52b788, #4cc9f0)' }}
                >
                  {addingFoods
                    ? 'Adding...'
                    : selectedFoods.size === 0
                    ? 'Select foods to add'
                    : `Add ${selectedFoods.size} food${selectedFoods.size > 1 ? 's' : ''}`
                  }
                </button>
              </>
            )}

            {/* Empty State */}
            {!loading && !error && searchQuery.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Start typing to search for foods
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
