import { USDASearchResponse, USDAFood } from './types';

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY!;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Foundation + SR Legacy food categories that represent whole plant foods.
// Everything else in these data types is a prepared/composite dish
// (Baked Products, Baby Foods, Sweets, Fast Foods, etc.) and gets dropped.
// "Fats and Oils" is included too, but narrowed further below (see
// isAllowedOil) since that category also holds butter, margarine, and lard.
const ALLOWED_FOOD_CATEGORIES = new Set([
  'Fruits and Fruit Juices',
  'Vegetables and Vegetable Products',
  'Legumes and Legume Products',
  'Nut and Seed Products',
  'Cereal Grains and Pasta',
  'Spices and Herbs',
  'Fats and Oils',
  'Beverages',
]);

// SR Legacy names some entries as "<Category label>, <food>, <prep>"
// (e.g. "Spices, turmeric, ground" / "Nuts, cashew nuts, raw"). For these,
// segment 1 is a bare category label, not a food name, so the canonical
// name is built starting from segment 2 instead.
const CATEGORY_PREFIXES_TO_STRIP = new Set(['spices', 'herbs', 'nuts', 'seeds', 'beverages']);

// USDA's "Fats and Oils" category also contains butter, margarine, lard,
// and shortening. Pure vegetable/nut/seed oils are consistently named
// "Oil, <source>" in both Foundation and SR Legacy, so that prefix is used
// as an allowlist rather than trying to name every non-oil fat individually.
function isAllowedOil(description: string): boolean {
  return /^oil,/i.test(description);
}

// USDA's "Beverages" category is almost entirely soda, sports drinks, and
// alcohol. Plant milks and coconut water are the exception worth surfacing.
function isAllowedBeverage(description: string): boolean {
  return /\b(almond|oat|rice|coconut|cashew|hemp|pea|soy)\s+milk\b/i.test(description)
    || /\bcoconut\s+water\b/i.test(description);
}

// Plenty of real whole plant foods — microgreens, bagged salad, sprouts,
// fresh herbs — only exist in USDA's "Branded" (packaged product) data,
// since that's how they're actually sold. Branded's own category taxonomy
// already separates minimally-processed produce from snacks/meals/candy,
// so it's used as a second, much narrower allowlist rather than opening up
// all of Branded (which is dominated by processed foods).
const BRANDED_ALLOWED_CATEGORIES = new Set([
  'Pre-Packaged Fruit & Vegetables',
  'Frozen Vegetables',
  'Frozen Fruits',
  'Canned Vegetables',
  'Herbs & Spices',
  // Prepared/processed nuts and seeds (roasted nuts, trail mix, nut butters).
  'Popcorn, Peanuts, Seeds & Related Snacks',
  'Nut & Seed Butters',
  'Other Grains & Seeds',
  // Vitamins, minerals, and nutritional supplements.
  'Specialty Formula Supplements',
  'Herbal Supplements',
  'Meal Replacement Supplements',
  'Digestive & Fiber Supplements',
  'Fatty Acid Supplements',
  'Green Supplements',
]);

// Segments that describe preparation or state, not the food itself. Skipped
// when building canonical names, so e.g. "Kale, raw" stays "Kale" instead of
// becoming "Raw Kale".
const PREP_MODIFIERS = new Set([
  // Cooking methods
  'raw', 'cooked', 'boiled', 'baked', 'steamed', 'roasted', 'fried',
  'grilled', 'sauteed', 'stewed', 'poached', 'microwaved', 'microwave', 'stir-fried',
  'uncooked', 'unprepared', 'blanched', 'parboiled', 'heated', 'unheated',
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
  // Dryness
  'dry',
  // Salt, combined phrasing
  'with salt added', 'without salt added',
  // Generic USDA catch-alls that aren't a meaningful variety
  'all commercial varieties', 'composite', 'nfs',
]);

// Words that mark an entry as containing animal products. Any of these
// appearing as a whole word in the description filters the entry out.
// Word-boundary matching means "eggplant" survives the "egg" check.
const ANIMAL_PRODUCT_WORDS = new Set([
  // Meat
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'goose',
  'bison', 'venison', 'rabbit', 'ham', 'bacon', 'sausage', 'steak',
  'franks', 'frankfurter', 'frankfurters', 'pepperoni', 'salami',
  'prosciutto', 'bologna', 'pastrami', 'meatball', 'meatballs',
  'meat', 'meats', 'poultry', 'gelatin', 'lard', 'tallow', 'suet',
  // Seafood
  'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster',
  'tilapia', 'trout', 'halibut', 'sardine', 'sardines', 'anchovy',
  'anchovies', 'oyster', 'oysters', 'clam', 'clams', 'mussel',
  'mussels', 'scallop', 'scallops', 'squid', 'octopus', 'prawn',
  'prawns', 'crawfish', 'crayfish', 'seafood',
  // Eggs and unambiguous dairy
  'egg', 'eggs', 'whey', 'casein', 'ghee', 'yogurt', 'kefir',
]);

// Description-level fragments that mark an entry as a cooking byproduct,
// composite dish, or industrial-use derivative rather than the whole food
// itself. Substring match on the lowercased description.
const REJECT_DESCRIPTION_FRAGMENTS = [
  'liquid from', 'cooking liquid', 'juice from', 'juice of',
  'drained solids of', 'drained liquids', 'industrial', 'sauce,',
  'products,', 'home-prepared', 'granules', 'flakes', 'milk chocolate',
  'coleslaw', 'cole slaw',
];

function containsAnimalProduct(description: string): boolean {
  const words = description.toLowerCase().match(/\b[a-z]+\b/g) || [];
  return words.some(w => ANIMAL_PRODUCT_WORDS.has(w));
}

function isRejectedDescription(description: string): boolean {
  const lower = description.toLowerCase();
  return REJECT_DESCRIPTION_FRAGMENTS.some(f => lower.includes(f));
}

// USDA tags branded/proprietary entries with an all-caps manufacturer name
// (e.g. "HOUSE FOODS Premium Firm Tofu", "MORI-NU, Tofu, silken, firm").
// A comprehensive plant-food list should surface the whole food itself
// ("Tofu", "Firm Tofu") rather than dozens of near-duplicate brand SKUs.
function isBrandedDescription(description: string): boolean {
  return /\b[A-Z]{2,}\b/.test(description);
}

function toCanonicalName(description: string): string {
  // "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw" → "Chickpeas, mature seeds, raw"
  const withoutParens = description.replace(/\s*\([^)]*\)/g, '').trim();
  const segments = withoutParens.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return description;

  let name = segments[0];
  const firstLower = name.toLowerCase();

  if (CATEGORY_PREFIXES_TO_STRIP.has(firstLower) && segments.length >= 2) {
    name = segments[1];
    segments.splice(0, 2, name);
  }

  if (segments.length > 1) {
    // USDA orders modifiers broad-to-specific ("Beans, snap, green"), so we
    // reverse them for a natural adjective order ("Green Snap Beans"). Strip
    // any occurrence of the base word from modifiers so we don't emit
    // "... Beans Beans" when USDA repeats it.
    const baseLower = segments[0].toLowerCase();
    const baseStem = (baseLower.endsWith('s') ? baseLower.slice(0, -1) : baseLower)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const baseRegex = new RegExp(`\\b${baseStem}s?\\b`, 'gi');
    const modifiers = segments.slice(1)
      .map(s => s.replace(baseRegex, '').replace(/^(and|or)\s+/i, '').replace(/\s+/g, ' ').trim())
      .filter(s => s && !PREP_MODIFIERS.has(s.toLowerCase()))
      .reverse();
    if (modifiers.length > 0) {
      name = modifiers.join(' ') + ' ' + segments[0];
    } else {
      name = segments[0];
    }
  }

  return name.replace(/\b\w/g, c => c.toUpperCase());
}

// Branded descriptions don't follow SR Legacy's "food, prep, variety"
// ordering, so they get lighter cleanup instead of toCanonicalName's
// modifier-reordering: drop a leading segment that's just the brand
// ("NEW DAY FARMS, Microgreens Sunflower" → "Microgreens Sunflower"), and
// drop a trailing segment that only echoes the rest ("Micro Rainbow
// Organic Mix, Micro Rainbow" → "Micro Rainbow Organic Mix").
function toBrandedCanonicalName(description: string, brandOwner?: string, brandName?: string): string {
  const withoutBraces = description.replace(/[{}()]/g, ' ').replace(/\s+/g, ' ').trim();
  let segments = withoutBraces.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return description;

  if (segments.length > 1) {
    const first = segments[0].toLowerCase();
    const brands = [brandOwner, brandName].filter(Boolean).map(b => b!.toLowerCase());
    // Only drop the segment when it's entirely brand text (the brand name
    // starts with it) — not merely when it contains the brand as a
    // substring, which would also strip real food words sharing a prefix
    // with the brand (e.g. "AeroFarms Baby Bok Choy" contains "AeroFarms").
    if (brands.some(b => b === first || b.startsWith(first))) {
      segments = segments.slice(1);
    }
  }

  // USDA often repeats a short generic name alongside the fuller product
  // name, in either order ("Trail Mix, Tahoe Trail Mix" or "Micro Rainbow
  // Organic Mix, Micro Rainbow"). For the common two-segment case, keep
  // whichever segment is the more specific (longer) one.
  if (segments.length === 2) {
    const [a, b] = segments.map(s => s.toLowerCase());
    if (a !== b && b.includes(a)) {
      segments = [segments[1]];
    }
  }

  if (segments.length > 1) {
    const last = segments[segments.length - 1].toLowerCase();
    const rest = segments.slice(0, -1).join(' ').toLowerCase();
    if (rest.includes(last)) {
      segments = segments.slice(0, -1);
    }
  }

  return segments.join(', ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// True when every whitespace-separated word in the query appears anywhere in
// the description (not just at a word start) — so "berry" matches
// "Blueberries", "nut" matches "Walnuts", "melon" matches "Watermelon".
function matchesQuery(description: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const text = description.toLowerCase();
  return q.split(/\s+/).every(word => text.includes(word));
}

async function fetchUsda(query: string, dataType: string, pageSize: number) {
  const response = await fetch(
    `${USDA_BASE_URL}/foods/search` +
    `?query=${encodeURIComponent(query)}` +
    `&dataType=${encodeURIComponent(dataType)}` +
    `&pageSize=${pageSize}` +
    `&api_key=${USDA_API_KEY}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch foods from USDA API');
  }
  return response.json();
}

export async function searchFoods(query: string, pageSize: number = 100): Promise<USDASearchResponse> {
  try {
    // Foundation + SR Legacy (whole-food reference data) and Branded
    // (packaged products) use different category taxonomies and naming
    // conventions, so they're fetched and filtered separately, then merged.
    const [wholeFoodData, brandedData] = await Promise.all([
      fetchUsda(query, 'Foundation,SR Legacy', pageSize),
      fetchUsda(query, 'Branded', 50),
    ]);

    // Dedupe by canonical name (prefer Foundation, then SR Legacy, then
    // Branded). Map.set on an existing key preserves insertion order, so
    // USDA's relevance ranking is retained within each source.
    const seen = new Map<string, USDAFood>();
    const dataTypeRank: Record<string, number> = { Foundation: 0, 'SR Legacy': 1, Branded: 2 };

    for (const food of (wholeFoodData.foods || []) as USDAFood[]) {
      const category = (food as { foodCategory?: string }).foodCategory;
      if (!category || !ALLOWED_FOOD_CATEGORIES.has(category)) continue;
      if (category === 'Fats and Oils' && !isAllowedOil(food.description)) continue;
      if (category === 'Beverages' && !isAllowedBeverage(food.description)) continue;

      if (containsAnimalProduct(food.description)) continue;
      if (isRejectedDescription(food.description)) continue;
      if (isBrandedDescription(food.description)) continue;
      if (!matchesQuery(food.description, query)) continue;

      const canonical = toCanonicalName(food.description);
      const key = canonical.toLowerCase();
      const existing = seen.get(key);
      if (!existing || dataTypeRank[food.dataType] < dataTypeRank[existing.dataType]) {
        seen.set(key, { ...food, description: canonical });
      }
    }

    for (const food of (brandedData.foods || []) as USDAFood[]) {
      const category = (food as { foodCategory?: string }).foodCategory;
      if (!category || !BRANDED_ALLOWED_CATEGORIES.has(category)) continue;

      if (containsAnimalProduct(food.description)) continue;
      if (isRejectedDescription(food.description)) continue;
      if (!matchesQuery(food.description, query)) continue;

      const brandOwner = (food as { brandOwner?: string }).brandOwner;
      const brandName = (food as { brandName?: string }).brandName;
      const canonical = toBrandedCanonicalName(food.description, brandOwner, brandName);
      const key = canonical.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { ...food, description: canonical });
      }
    }

    return { ...wholeFoodData, foods: Array.from(seen.values()).slice(0, 25) };
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
