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
  const [selectedFood, setSelectedFood] = useState<USDAFood | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [addingFood, setAddingFood] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDuplicateMessage, setShowDuplicateMessage] = useState(false);
  const [duplicateFoodName, setDuplicateFoodName] = useState('');
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

  function handleSelectFood(food: USDAFood) {
    setSelectedFood(food);
    setShowConfirmation(true);
  }

  async function handleConfirmYes() {
    if (!selectedFood) return;

    setAddingFood(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get current week's Monday and Sunday in local timezone
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when today is Sunday
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const mondayStr = formatLocalDate(monday);
      const sundayStr = formatLocalDate(sunday);

      // Check if this food has already been logged this week
      const { data: existingLogs, error: checkError } = await supabase
        .from('food_logs')
        .select('id, food_name')
        .eq('user_id', user.id)
        .eq('fdc_id', selectedFood.fdcId)
        .gte('logged_date', mondayStr)
        .lte('logged_date', sundayStr);

      if (checkError) throw checkError;

      // If food already logged this week, show celebratory message
      if (existingLogs && existingLogs.length > 0) {
        setDuplicateFoodName(selectedFood.description);
        setShowDuplicateMessage(true);
        setShowConfirmation(false);
        setSelectedFood(null);
        setSearchQuery('');
        setSearchResults([]);

        // Hide duplicate message and close modal after 2.5 seconds
        setTimeout(() => {
          setShowDuplicateMessage(false);
          setDuplicateFoodName('');
          onClose();
        }, 2500);

        setAddingFood(false);
        return;
      }

      // Log the food using local timezone
      const todayStr = formatLocalDate(new Date());
      const { error: logError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          fdc_id: selectedFood.fdcId,
          food_name: selectedFood.description,
          food_data_type: selectedFood.dataType,
          food_nutrients: selectedFood.foodNutrients,
          logged_date: todayStr,
          logged_at: new Date().toISOString(),
        });

      if (logError) throw logError;

      // Show success message
      setShowSuccess(true);
      setShowConfirmation(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);

      // Hide success message and close modal after 1.5 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onFoodAdded();
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to add food. Please try again.');
      setShowConfirmation(false);
    } finally {
      setAddingFood(false);
    }
  }

  function handleConfirmNo() {
    setShowConfirmation(false);
    setSelectedFood(null);
  }

  function handleClose() {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSelectedFood(null);
    setShowConfirmation(false);
    setShowSuccess(false);
    setShowDuplicateMessage(false);
    setDuplicateFoodName('');
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
            <p className="text-2xl font-bold" style={{ color: '#52b788' }}>
              Added!
            </p>
          </div>
        )}

        {/* Duplicate Food Message */}
        {showDuplicateMessage && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold mb-2" style={{ color: '#d4006f' }}>
              Great job!
            </p>
            <p className="text-lg text-gray-700">
              You already logged <span className="font-semibold">{duplicateFoodName}</span> this week!
            </p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && selectedFood && !showSuccess && (
          <div className="text-center">
            <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
              Did you eat this?
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="font-semibold text-lg text-gray-900">{selectedFood.description}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedFood.dataType}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmNo}
                disabled={addingFood}
                className="flex-1 py-3 rounded-xl font-semibold border-2 transition-colors disabled:opacity-50"
                style={{ borderColor: '#d4006f', color: '#d4006f' }}
              >
                No
              </button>
              <button
                onClick={handleConfirmYes}
                disabled={addingFood}
                className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#52b788' }}
              >
                {addingFood ? 'Adding...' : 'Yes!'}
              </button>
            </div>
          </div>
        )}

        {/* Search Interface */}
        {!showConfirmation && !showSuccess && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
                Add a Food
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
                placeholder="Search for a food..."
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

            {/* Search Results */}
            {!loading && searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((food) => (
                  <button
                    key={food.fdcId}
                    onClick={() => handleSelectFood(food)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <p className="font-semibold text-gray-900">{food.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{food.dataType}</p>
                  </button>
                ))}
              </div>
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
