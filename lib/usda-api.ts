import { USDASearchResponse, USDAFood } from './types';

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY!;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Foundation + SR Legacy food categories that represent whole plant foods.
// Everything else in these data types is a prepared/composite dish
// (Baked Products, Baby Foods, Sweets, Fast Foods, etc.) and gets dropped.
const ALLOWED_FOOD_CATEGORIES = new Set([
  'Fruits and Fruit Juices',
  'Vegetables and Vegetable Products',
  'Legumes and Legume Products',
  'Nut and Seed Products',
  'Cereal Grains and Pasta',
  'Spices and Herbs',
]);

// SR Legacy names some entries as "<Category>, <food>, <prep>"
// (e.g. "Spices, turmeric, ground"). For these, the food name is segment 2.
const CATEGORY_PREFIXES_TO_STRIP = new Set(['spices', 'herbs', 'nuts', 'seeds']);

// First-segment food names that are too generic to be the whole canonical
// name — we expand them with the following segments so different varieties
// get distinct entries (e.g. "Green Snap Beans" vs "Red Kidney Beans").
// Being liberal here is safe: if USDA doesn't provide a variety modifier
// for an entry, the canonical name falls back to just the base word.
const GENERIC_BASE_FOODS = new Set([
  // Legumes
  'beans', 'peas', 'lentils', 'soybeans',
  // Grains
  'rice', 'wheat', 'oats', 'barley', 'corn', 'quinoa', 'millet',
  'buckwheat', 'rye', 'sorghum', 'amaranth', 'flour',
  // Leafy / cabbage family
  'lettuce', 'cabbage', 'kale', 'spinach', 'cauliflower', 'broccoli',
  'collards', 'chard', 'endive', 'watercress', 'arugula', 'greens',
  // Alliums
  'onions', 'garlic', 'leeks', 'chives', 'shallots', 'scallions',
  // Nightshades
  'peppers', 'tomatoes', 'potatoes', 'eggplant',
  // Cucurbits
  'squash', 'melons', 'cucumbers', 'pumpkin', 'gourds',
  // Roots and tubers
  'carrots', 'radishes', 'turnips', 'beets', 'parsnips', 'rutabagas',
  'yams', 'cassava', 'jicama',
  // Other vegetables
  'mushrooms', 'asparagus', 'artichokes', 'celery', 'okra',
  'sprouts', 'bamboo shoots', 'fennel',
  // Fruits
  'apples', 'pears', 'grapes', 'oranges', 'cherries', 'plums',
  'peaches', 'apricots', 'nectarines', 'mangoes', 'kiwifruit',
  'pineapples', 'bananas', 'figs', 'dates', 'persimmons',
  'pomegranates', 'papayas', 'guavas', 'lychees', 'passion-fruit',
  'lemons', 'limes', 'grapefruit', 'tangerines',
  // Berries
  'berries', 'strawberries', 'blueberries', 'raspberries',
  'blackberries', 'cranberries', 'gooseberries', 'currants',
  'elderberries', 'mulberries',
  // Melons
  'watermelon', 'cantaloupe', 'honeydew',
]);

// Segments that describe preparation or state, not the food itself. Skipped
// when building canonical names for generic-base foods.
const PREP_MODIFIERS = new Set([
  // Cooking methods
  'raw', 'cooked', 'boiled', 'baked', 'steamed', 'roasted', 'fried',
  'grilled', 'sauteed', 'stewed', 'poached', 'microwaved', 'stir-fried',
  'uncooked', 'unprepared', 'blanched', 'parboiled',
  // Preservation
  'dried', 'frozen', 'canned', 'fresh', 'dehydrated', 'freeze-dried',
  // Salt / sodium
  'with salt', 'without salt', 'unsalted', 'salted', 'lightly salted',
  'low sodium', 'reduced sodium', 'sodium added', 'no salt added',
  // Skin / peel
  'with skin', 'without skin', 'skin on', 'skinless', 'peeled', 'unpeeled',
  // Seeds / pit
  'mature seeds', 'immature seeds', 'seeded', 'unseeded', 'pitted', 'unpitted',
  // Liquid state
  'drained', 'drained solids', 'solids and liquids', 'in tap water',
  'in water', 'and rinsed', 'drained and rinsed', 'rinsed in tap water',
  'vacuum pack', 'liquid', 'undrained',
  // Sugar
  'sweetened', 'unsweetened', 'with added sugar', 'no added sugar',
  'lightly sweetened', 'sugar sweetened',
  // Sulfur
  'sulfured', 'unsulfured',
  // Cut / shape
  'chopped', 'sliced', 'shredded', 'mashed', 'whole', 'diced', 'cubed',
  'grated', 'pureed', 'ground', 'cut', 'strips', 'pieces', 'chunks',
  'wedges', 'halves', 'quarters',
  // Enrichment
  'unenriched', 'enriched', 'fortified', 'unfortified',
  // Ripeness / age
  'ripe', 'unripe', 'underripe', 'young', 'mature',
  // Fat state
  'reduced fat', 'low fat', 'nonfat', 'full fat', 'fat free',
  // Grain milling (less relevant for produce but harmless)
  'regular', 'instant', 'quick', 'old-fashioned',
]);

function toCanonicalName(description: string): string {
  // "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw" → "Chickpeas, mature seeds, raw"
  const withoutParens = description.replace(/\s*\([^)]*\)/g, '').trim();
  const segments = withoutParens.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return description;

  let name = segments[0];
  const firstLower = name.toLowerCase();

  if (CATEGORY_PREFIXES_TO_STRIP.has(firstLower) && segments.length >= 2) {
    name = segments[1];
  } else if (GENERIC_BASE_FOODS.has(firstLower)) {
    // USDA orders modifiers broad-to-specific ("Beans, snap, green"), so we
    // reverse them for a natural adjective order ("Green Snap Beans").
    const modifiers = segments.slice(1)
      .filter(s => !PREP_MODIFIERS.has(s.toLowerCase()))
      .reverse();
    if (modifiers.length > 0) {
      name = modifiers.join(' ') + ' ' + name;
    }
  }

  return name.replace(/\b\w/g, c => c.toUpperCase());
}

// True when every whitespace-separated word in the query appears at the start
// of some word in the description, where "word start" means the start of the
// string or after whitespace/comma. Hyphens are NOT word boundaries — this is
// what keeps "apple" from matching "Rose-apples" while still letting
// "green beans" match "Beans, snap, green, raw".
function matchesQueryPrefix(description: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const text = description.toLowerCase();
  return q.split(/\s+/).every(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[\\s,])${escaped}`).test(text);
  });
}

export async function searchFoods(query: string, pageSize: number = 50): Promise<USDASearchResponse> {
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search` +
      `?query=${encodeURIComponent(query)}` +
      `&dataType=Foundation,SR%20Legacy` +
      `&pageSize=${pageSize}` +
      `&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch foods from USDA API');
    }

    const data = await response.json();

    if (data.foods) {
      // Filter to allowed plant-food categories, then dedupe by canonical
      // name (prefer Foundation over SR Legacy). Map.set on an existing key
      // preserves insertion order, so USDA's relevance ranking is retained.
      const seen = new Map<string, USDAFood>();
      for (const food of data.foods as USDAFood[]) {
        const category = (food as { foodCategory?: string }).foodCategory;
        if (!category || !ALLOWED_FOOD_CATEGORIES.has(category)) continue;

        if (!matchesQueryPrefix(food.description, query)) continue;
        const canonical = toCanonicalName(food.description);
        const key = canonical.toLowerCase();
        const existing = seen.get(key);
        if (!existing || (existing.dataType !== 'Foundation' && food.dataType === 'Foundation')) {
          seen.set(key, { ...food, description: canonical });
        }
      }
      data.foods = Array.from(seen.values()).slice(0, 15);
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
