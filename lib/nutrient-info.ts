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

  // Define meaningful thresholds and scoring for each nutrient
  // Based on % of daily value in a typical serving
  const getNutrientScore = (name: string, value: number, unit: string): number => {
    // Normalize to a score based on significance
    // Higher score = more significant for this food
    switch (name) {
      case 'Vitamin C':
        // DV: 90mg, anything >10mg is worth noting
        return value > 10 ? value / 2 : 0;
      case 'Vitamin A':
        // DV: 900mcg, measured in IU (1 IU = 0.3mcg) or mcg
        return unit === 'IU' ? value / 100 : value / 30;
      case 'Vitamin K':
        // DV: 120mcg
        return value / 5;
      case 'Folate':
        // DV: 400mcg
        return value / 10;
      case 'Potassium':
        // DV: 4700mg
        return value / 100;
      case 'Fiber':
        // DV: 28g, only count if >2g
        return value > 2 ? value * 2 : 0;
      case 'Calcium':
        // DV: 1300mg
        return value / 30;
      case 'Iron':
        // DV: 18mg
        return value / 0.5;
      case 'Magnesium':
        // DV: 420mg
        return value / 10;
      case 'Protein':
        // DV: 50g, only count if >3g
        return value > 3 ? value * 1.5 : 0;
      case 'Vitamin E':
        // DV: 15mg
        return value / 0.5;
      case 'Vitamin B6':
        // DV: 1.7mg
        return value / 0.05;
      case 'Zinc':
        // DV: 11mg
        return value / 0.3;
      case 'Vitamin B12':
        // DV: 2.4mcg
        return value / 0.1;
      default:
        return 0;
    }
  };

  const relevantNutrients = nutrients
    .filter((n: USDAFoodNutrient) => NUTRIENT_INFO[n.nutrientId])
    .map((n: USDAFoodNutrient) => ({
      id: n.nutrientId,
      name: NUTRIENT_INFO[n.nutrientId].name,
      value: n.value,
      unit: n.unitName,
      explanation: NUTRIENT_INFO[n.nutrientId].explanation,
      score: getNutrientScore(NUTRIENT_INFO[n.nutrientId].name, n.value, n.unitName),
    }))
    .filter(n => n.score > 0) // Only include nutrients with meaningful amounts
    .sort((a, b) => b.score - a.score);

  return relevantNutrients.slice(0, 2);
}
