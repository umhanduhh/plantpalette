'use client';

import { useState, useEffect, useRef } from 'react';
import { searchFoods } from '@/lib/usda-api';
import { USDAFood, formatLocalDate } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getPlantColorInfo, PLANT_COLOR_HEX } from '@/lib/plant-colors';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodAdded: () => void;
}

// Picks the most generic / canonical-feeling result to lead with as the
// "Best match" — the fewest-word name among the top few relevance-ranked
// results (e.g. "Apples" over "Honeycrisp Apples"). Everything else is
// still shown, just grouped under "Other matches" instead of hidden.
function pickBestMatch(foods: USDAFood[]): { best: USDAFood | null; rest: USDAFood[] } {
  if (foods.length === 0) return { best: null, rest: [] };
  const searchWindow = Math.min(foods.length, 8);
  let bestIndex = 0;
  let bestWordCount = foods[0].description.split(/\s+/).length;
  for (let i = 1; i < searchWindow; i++) {
    const wordCount = foods[i].description.split(/\s+/).length;
    if (wordCount < bestWordCount) {
      bestWordCount = wordCount;
      bestIndex = i;
    }
  }
  const best = foods[bestIndex];
  const rest = foods.filter((_, i) => i !== bestIndex);
  return { best, rest };
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FoodRow({
  food,
  selected,
  featured = false,
  onToggle,
}: {
  food: USDAFood;
  selected: boolean;
  featured?: boolean;
  onToggle: () => void;
}) {
  const info = getPlantColorInfo(food.description);
  const dotColor = info?.color ? PLANT_COLOR_HEX[info.color] : null;
  const metaText = info
    ? [info.colorLabel, info.category].filter(Boolean).join(' · ')
    : null;

  return (
    <div className={`pp-row ${featured ? 'pp-row--best' : ''}`} role="listitem">
      <div
        className="pp-row-icon"
        style={{
          background: dotColor ? `color-mix(in srgb, ${dotColor} 16%, white)` : 'var(--surface-chip)',
        }}
        aria-hidden="true"
      >
        <span
          className="pp-dot"
          style={{
            width: featured ? 16 : 12,
            height: featured ? 16 : 12,
            background: dotColor || 'var(--muted)',
            opacity: dotColor ? 1 : 0.5,
          }}
        />
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="pp-row-body text-left"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <p className="pp-row-name">{food.description}</p>
        {metaText && (
          <p className="pp-row-meta">
            {info?.colorLabel && <span className="pp-dot" style={{ background: dotColor || undefined, width: 6, height: 6 }} />}
            {metaText}
          </p>
        )}
      </button>

      <button
        type="button"
        onClick={onToggle}
        className={`pp-add-btn ${selected ? 'pp-add-btn--added' : ''}`}
        aria-pressed={selected}
        aria-label={selected ? `Remove ${food.description}` : `Add ${food.description}`}
      >
        {selected ? <CheckIcon /> : <PlusIcon />}
        {selected ? 'Added' : 'Add'}
      </button>
    </div>
  );
}

export default function AddFoodModal({ isOpen, onClose, onFoodAdded }: AddFoodModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<USDAFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<Map<number, USDAFood>>(new Map());
  const [addingFoods, setAddingFoods] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function toggleFoodSelection(food: USDAFood) {
    const newSelected = new Map(selectedFoods);
    if (newSelected.has(food.fdcId)) {
      newSelected.delete(food.fdcId);
    } else {
      newSelected.set(food.fdcId, food);
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
      const foodsToAdd = Array.from(selectedFoods.values());

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
      setSelectedFoods(new Map());
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
    setSelectedFoods(new Map());
    setShowSuccess(false);
    setSuccessMessage('');
    onClose();
  }

  function handleClearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    inputRef.current?.focus();
  }

  if (!isOpen) return null;

  const { best, rest } = pickBestMatch(searchResults);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="p-6 max-w-md w-full max-h-[85vh] overflow-y-auto flex flex-col" style={{ background: 'var(--surface)', borderRadius: 'var(--r-sheet)' }}>
        {/* Success Message */}
        {showSuccess && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-2xl font-bold mb-2 font-[family-name:var(--font-playfair)]" style={{ color: 'var(--fresh-green)' }}>
              Nice!
            </p>
            <p className="text-lg" style={{ color: 'var(--body-text)' }}>
              {successMessage}
            </p>
          </div>
        )}

        {/* Search Interface */}
        {!showSuccess && (
          <>
            <div className="pp-sheet-header">
              <h2 className="pp-sheet-title">Add foods</h2>
              <button
                onClick={handleClose}
                className="pp-icon-btn"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Search Input */}
            <div className="pp-search-wrap mb-1">
              <span className="pp-search-icon">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for a food, like apple"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pp-search-input"
                aria-label="Search for foods"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="pp-search-clear"
                  aria-label="Clear search"
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 mt-3">
              {/* Loading State */}
              {loading && (
                <div className="pp-state-copy">Searching&hellip;</div>
              )}

              {/* Error / no-results Message */}
              {!loading && error && (
                <div className="pp-state-copy">{error}</div>
              )}

              {/* Results — Best match + Other matches */}
              {!loading && !error && searchResults.length > 0 && (
                <div className="mb-2">
                  {best && (
                    <div className="mb-4">
                      <p className="pp-section-label mb-2">Best match</p>
                      <div role="list">
                        <FoodRow
                          food={best}
                          selected={selectedFoods.has(best.fdcId)}
                          featured
                          onToggle={() => toggleFoodSelection(best)}
                        />
                      </div>
                    </div>
                  )}

                  {rest.length > 0 && (
                    <div>
                      <p className="pp-section-label mb-1">Other matches</p>
                      <div role="list">
                        {rest.map((food) => (
                          <FoodRow
                            key={food.fdcId}
                            food={food}
                            selected={selectedFoods.has(food.fdcId)}
                            onToggle={() => toggleFoodSelection(food)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && searchQuery.length === 0 && (
                <div className="pp-state-copy">
                  Start typing to add a plant to your week &mdash; try &ldquo;blueberries&rdquo; or &ldquo;sweet potato&rdquo;.
                </div>
              )}
            </div>

            {/* Add Selected Button */}
            {selectedFoods.size > 0 && (
              <button
                onClick={handleAddSelectedFoods}
                disabled={addingFoods}
                className="pp-btn-primary w-full text-lg mt-4"
              >
                {addingFoods
                  ? 'Adding...'
                  : `Add ${selectedFoods.size} food${selectedFoods.size > 1 ? 's' : ''}`
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
