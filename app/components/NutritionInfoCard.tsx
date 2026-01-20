'use client';

import { FoodLog } from '@/lib/types';
import { getTopNutrients } from '@/lib/nutrient-info';

interface NutritionInfoCardProps {
  food: FoodLog | null;
  onClose: () => void;
}

export default function NutritionInfoCard({ food, onClose }: NutritionInfoCardProps) {
  if (!food) return null;

  const topNutrients = getTopNutrients(food.food_nutrients);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-3xl">🥗</div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Food Name */}
        <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold mb-6" style={{ color: '#d4006f' }}>
          {food.food_name}
        </h2>

        {/* Nutrients */}
        {topNutrients.length > 0 ? (
          <div className="space-y-4">
            {topNutrients.map((nutrient, index) => (
              <div key={index} className="p-4 rounded-xl" style={{ backgroundColor: index === 0 ? '#fff5f8' : '#f0f9ff' }}>
                <h3 className="font-bold text-lg mb-2" style={{ color: index === 0 ? '#d4006f' : '#4cc9f0' }}>
                  {nutrient.name}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {nutrient.explanation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Detailed nutrient information not available for this food.
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl font-semibold text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
