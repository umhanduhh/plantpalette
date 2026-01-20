import { USDAFoodNutrient } from './types';

// Map of nutrient IDs to friendly info
export const NUTRIENT_INFO: Record<number, { name: string; explanation: string }> = {
  1003: {
    name: 'Protein',
    explanation: 'Protein helps build and repair tissues, supports your immune system, and keeps you feeling satisfied after meals.'
  },
  1079: {
    name: 'Fiber',
    explanation: 'Fiber supports digestive health, helps maintain steady blood sugar levels, and keeps you feeling full.'
  },
  1087: {
    name: 'Calcium',
    explanation: 'Calcium builds strong bones and teeth, and plays a role in muscle function and nerve signaling.'
  },
  1089: {
    name: 'Iron',
    explanation: 'Iron helps carry oxygen throughout your body and supports energy levels and immune function.'
  },
  1162: {
    name: 'Vitamin C',
    explanation: 'Vitamin C supports your immune system, helps your body absorb iron, and promotes healthy skin.'
  },
  1165: {
    name: 'Vitamin B6',
    explanation: 'Vitamin B6 supports brain health, helps make neurotransmitters, and aids in protein metabolism.'
  },
  1166: {
    name: 'Folate',
    explanation: 'Folate supports cell growth and DNA formation, and is especially important for brain health.'
  },
  1178: {
    name: 'Vitamin A',
    explanation: 'Vitamin A supports vision, immune function, and healthy skin.'
  },
  1180: {
    name: 'Vitamin E',
    explanation: 'Vitamin E acts as an antioxidant, protecting your cells from damage and supporting immune health.'
  },
  1185: {
    name: 'Vitamin K',
    explanation: 'Vitamin K is essential for blood clotting and supports bone health.'
  },
  1090: {
    name: 'Magnesium',
    explanation: 'Magnesium supports muscle and nerve function, helps maintain steady energy, and promotes bone health.'
  },
  1092: {
    name: 'Potassium',
    explanation: 'Potassium helps regulate blood pressure, supports heart health, and maintains fluid balance.'
  },
  1095: {
    name: 'Zinc',
    explanation: 'Zinc supports immune function, wound healing, and plays a role in taste and smell.'
  },
  1109: {
    name: 'Vitamin B12',
    explanation: 'Vitamin B12 supports nerve function, red blood cell formation, and energy metabolism.'
  },
};

// Get the top 2 most significant nutrients from a food
export function getTopNutrients(nutrients: any): { name: string; value: number; unit: string; explanation: string }[] {
  if (!nutrients || !Array.isArray(nutrients)) return [];

  const relevantNutrients = nutrients
    .filter((n: USDAFoodNutrient) => NUTRIENT_INFO[n.nutrientId])
    .map((n: USDAFoodNutrient) => ({
      id: n.nutrientId,
      name: NUTRIENT_INFO[n.nutrientId].name,
      value: n.value,
      unit: n.unitName,
      explanation: NUTRIENT_INFO[n.nutrientId].explanation,
    }))
    .sort((a, b) => {
      // Sort by value, but consider different units
      // This is a simplified ranking - fiber, protein, vitamins weighted
      const weights: Record<string, number> = {
        'Fiber': 2,
        'Protein': 2,
        'Vitamin C': 1.5,
        'Vitamin A': 1.5,
      };
      const aWeight = weights[a.name] || 1;
      const bWeight = weights[b.name] || 1;
      return (b.value * bWeight) - (a.value * aWeight);
    });

  return relevantNutrients.slice(0, 2);
}
