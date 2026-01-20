import { USDASearchResponse, USDAFood } from './types';

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY!;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Plant-based food categories from USDA
const PLANT_BASED_CATEGORIES = [
  'Fruits and Fruit Juices',
  'Vegetables and Vegetable Products',
  'Legumes and Legume Products',
  'Nut and Seed Products',
  'Cereal Grains and Pasta',
  'Beverages',
  'Baked Products',
  'Spices and Herbs'
];

// Keywords that indicate non-plant-based foods
const NON_PLANT_KEYWORDS = [
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'goose',
  'meat', 'bacon', 'sausage', 'ham', 'steak', 'ground beef', 'ground pork',
  'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster', 'seafood',
  'milk', 'cheese', 'yogurt', 'butter', 'cream', 'whey', 'casein',
  'egg', 'eggs', 'gelatin', 'lard', 'tallow'
];

function isLikelyPlantBased(food: USDAFood): boolean {
  const description = food.description.toLowerCase();

  // First check if food is in a plant-based category
  const category = (food as any).foodCategory;
  if (category && !PLANT_BASED_CATEGORIES.includes(category)) {
    return false;
  }

  // Then check if food contains non-plant keywords
  const containsNonPlant = NON_PLANT_KEYWORDS.some(keyword =>
    description.includes(keyword)
  );

  if (containsNonPlant) return false;

  return true;
}

function cleanFoodName(description: string): string {
  // Remove "Foundation" and common suffixes
  let cleaned = description
    .replace(/,?\s*Foundation$/i, '')
    .replace(/,?\s*SR Legacy$/i, '')
    .replace(/,?\s*Survey \(FNDDS\)$/i, '')
    .trim();

  return cleaned;
}

export async function searchFoods(query: string, pageSize: number = 50): Promise<USDASearchResponse> {
  try {
    // Request more results to account for filtering
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch foods from USDA API');
    }

    const data = await response.json();

    // Filter out non-plant-based foods, clean names, and limit to 15 results
    if (data.foods) {
      data.foods = data.foods
        .filter(isLikelyPlantBased)
        .map((food: USDAFood) => ({
          ...food,
          description: cleanFoodName(food.description)
        }))
        .slice(0, 15);
    }

    return data;
  } catch (error) {
    console.error('USDA API error:', error);
    throw new Error('Hmm, couldn\'t find that. Try another search.');
  }
}

export async function getFoodDetails(fdcId: number) {
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch food details');
    }

    return await response.json();
  } catch (error) {
    console.error('USDA API error:', error);
    throw new Error('Couldn\'t load food details.');
  }
}
