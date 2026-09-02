// Lightweight food-name -> plant color/category mapping.
//
// The USDA data model has no color/category metadata, and we don't want to
// touch the database schema for a purely visual affordance. Instead we infer
// a color + category from the food's name using a keyword table. This is a
// best-effort visual cue, not nutrition data — unmatched foods simply render
// without a color dot.

export type PlantColorKey = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface PlantColorInfo {
  color: PlantColorKey | null;
  colorLabel: string | null;
  category: string;
}

export const PLANT_COLOR_HEX: Record<PlantColorKey, string> = {
  red: 'var(--primary-magenta)',
  orange: 'var(--vibrant-orange)',
  yellow: 'var(--golden-yellow)',
  green: 'var(--fresh-green)',
  blue: 'var(--sky-blue)',
  purple: 'var(--accent-purple)',
};

// Literal hex values for contexts that can't resolve CSS custom properties
// (e.g. the html2canvas-captured share card).
export const PLANT_COLOR_HEX_RAW: Record<PlantColorKey, string> = {
  red: '#d4006f',
  orange: '#ff6b35',
  yellow: '#ffd966',
  green: '#52b788',
  blue: '#4cc9f0',
  purple: '#8b5fbf',
};

const COLOR_LABEL: Record<PlantColorKey, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
};

// The taxonomy's 6 colors, in wheel order. Single source of truth for
// anything that needs to enumerate or validate against the color set
// (Gemini's response schema, form pickers, etc.).
export const PLANT_COLOR_KEYS: PlantColorKey[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export function isPlantColorKey(value: unknown): value is PlantColorKey {
  return typeof value === 'string' && (PLANT_COLOR_KEYS as string[]).includes(value);
}

export function plantColorLabel(color: PlantColorKey): string {
  return COLOR_LABEL[color];
}

// A few representative example foods per color, used to calibrate the
// photo-identification prompt so the model picks from *our* categories
// instead of inventing generic color names.
export const PLANT_COLOR_EXAMPLES: Record<PlantColorKey, string[]> = {
  red: ['strawberries', 'tomatoes', 'red bell pepper', 'watermelon', 'cherries'],
  orange: ['carrots', 'sweet potato', 'mango', 'orange', 'butternut squash'],
  yellow: ['corn', 'banana', 'yellow squash', 'pineapple', 'lemon'],
  green: ['spinach', 'broccoli', 'green beans', 'avocado', 'kiwi'],
  blue: ['blueberries'],
  purple: ['eggplant', 'purple cabbage', 'blackberries', 'plums', 'grapes'],
};

// [keywords, color, category] — keywords are matched as whole words/phrases
// against the lowercased food name. Longer/more specific phrases are checked
// first so "sweet potato" wins over the bare "potato" entry, etc.
const ENTRIES: Array<[string[], PlantColorKey | null, string]> = [
  // Root vegetables
  [['sweet potato', 'sweet potatoes', 'yam', 'yams'], 'orange', 'Root vegetable'],
  [['purple potato', 'purple potatoes'], 'purple', 'Root vegetable'],
  [['ube'], 'purple', 'Root vegetable'],
  [['potato', 'potatoes'], 'yellow', 'Root vegetable'],
  [['carrot', 'carrots'], 'orange', 'Root vegetable'],
  [['purple carrot'], 'purple', 'Root vegetable'],
  [['beet', 'beets', 'beetroot'], 'red', 'Root vegetable'],
  [['radish', 'radishes'], 'red', 'Root vegetable'],
  [['turnip', 'turnips'], 'purple', 'Root vegetable'],
  [['parsnip', 'parsnips'], 'yellow', 'Root vegetable'],
  [['ginger'], 'yellow', 'Root vegetable'],
  [['turmeric'], 'orange', 'Herb & spice'],
  [['cassava', 'yuca'], 'yellow', 'Root vegetable'],
  [['jicama'], 'yellow', 'Root vegetable'],

  // Squash / gourds
  [['butternut squash'], 'orange', 'Vegetable'],
  [['acorn squash'], 'orange', 'Vegetable'],
  [['spaghetti squash'], 'yellow', 'Vegetable'],
  [['yellow squash', 'summer squash'], 'yellow', 'Vegetable'],
  [['zucchini'], 'green', 'Vegetable'],
  [['pumpkin'], 'orange', 'Vegetable'],
  [['squash'], 'orange', 'Vegetable'],
  [['cucumber', 'cucumbers'], 'green', 'Vegetable'],

  // Leafy vegetables
  [['spinach'], 'green', 'Leafy vegetable'],
  [['kale'], 'green', 'Leafy vegetable'],
  [['arugula'], 'green', 'Leafy vegetable'],
  [['watercress'], 'green', 'Leafy vegetable'],
  [['collard', 'collards', 'collard greens'], 'green', 'Leafy vegetable'],
  [['chard', 'swiss chard'], 'green', 'Leafy vegetable'],
  [['romaine', 'iceberg', 'lettuce'], 'green', 'Leafy vegetable'],
  [['red cabbage', 'purple cabbage'], 'purple', 'Leafy vegetable'],
  [['cabbage'], 'green', 'Leafy vegetable'],
  [['bok choy'], 'green', 'Leafy vegetable'],
  [['endive'], 'green', 'Leafy vegetable'],
  [['radicchio'], 'purple', 'Leafy vegetable'],
  [['mustard greens', 'beet greens', 'turnip greens', 'greens'], 'green', 'Leafy vegetable'],

  // Nightshades / peppers
  [['red pepper', 'red bell pepper'], 'red', 'Vegetable'],
  [['yellow pepper', 'yellow bell pepper'], 'yellow', 'Vegetable'],
  [['orange pepper', 'orange bell pepper'], 'orange', 'Vegetable'],
  [['green pepper', 'green bell pepper', 'jalapeno', 'jalapeño', 'poblano', 'serrano'], 'green', 'Vegetable'],
  [['purple pepper'], 'purple', 'Vegetable'],
  [['bell pepper', 'pepper', 'peppers', 'chili', 'chile'], 'red', 'Vegetable'],
  [['tomato', 'tomatoes'], 'red', 'Vegetable'],
  [['eggplant', 'aubergine'], 'purple', 'Vegetable'],

  // Alliums
  [['red onion', 'red onions'], 'purple', 'Vegetable'],
  [['purple onion', 'purple onions'], 'purple', 'Vegetable'],
  [['onion, green', 'onions, green'], 'green', 'Vegetable'],
  [['onion, purple', 'onions, purple'], 'purple', 'Vegetable'],
  [['onion, red', 'onions, red'], 'purple', 'Vegetable'],
  [['onion', 'onions', 'shallot', 'shallots', 'leek', 'leeks'], 'yellow', 'Vegetable'],
  [['garlic'], 'yellow', 'Vegetable'],
  [['scallion', 'scallions', 'green onion', 'green onions', 'spring onion', 'spring onions', 'chive', 'chives'], 'green', 'Vegetable'],

  // Other vegetables
  [['broccoli'], 'green', 'Vegetable'],
  [['cauliflower'], 'yellow', 'Vegetable'],
  [['purple cauliflower'], 'purple', 'Vegetable'],
  [['brussels sprout', 'brussels sprouts'], 'green', 'Vegetable'],
  [['asparagus'], 'green', 'Vegetable'],
  [['celery'], 'green', 'Vegetable'],
  [['corn', 'sweet corn'], 'yellow', 'Vegetable'],
  [['artichoke', 'artichokes'], 'green', 'Vegetable'],
  [['okra'], 'green', 'Vegetable'],
  [['green bean', 'green beans', 'snap bean', 'snap beans', 'string bean'], 'green', 'Vegetable'],
  [['pea', 'peas', 'snap pea', 'snow pea', 'edamame'], 'green', 'Legume'],
  [['mushroom', 'mushrooms'], null, 'Vegetable'],
  [['fennel'], 'green', 'Vegetable'],
  [['sprout', 'sprouts', 'bean sprout'], 'green', 'Vegetable'],

  // Fruits — red
  [['strawberry', 'strawberries'], 'red', 'Fruit'],
  [['cherry', 'cherries'], 'red', 'Fruit'],
  [['cranberry', 'cranberries'], 'red', 'Fruit'],
  [['raspberry', 'raspberries'], 'red', 'Fruit'],
  [['watermelon'], 'red', 'Fruit'],
  [['pomegranate', 'pomegranates'], 'red', 'Fruit'],
  [['red apple'], 'red', 'Fruit'],
  [['red grape', 'red grapes'], 'red', 'Fruit'],
  [['rhubarb'], 'red', 'Fruit'],
  [['guava'], 'red', 'Fruit'],

  // Fruits — orange
  [['orange', 'oranges', 'mandarin', 'clementine', 'tangerine'], 'orange', 'Fruit'],
  [['mango', 'mangoes', 'mangos'], 'orange', 'Fruit'],
  [['apricot', 'apricots'], 'orange', 'Fruit'],
  [['cantaloupe'], 'orange', 'Fruit'],
  [['papaya', 'papayas'], 'orange', 'Fruit'],
  [['persimmon', 'persimmons'], 'orange', 'Fruit'],
  [['nectarine', 'nectarines'], 'orange', 'Fruit'],
  [['peach', 'peaches'], 'orange', 'Fruit'],

  // Fruits — yellow
  [['banana', 'bananas', 'plantain'], 'yellow', 'Fruit'],
  [['pineapple'], 'yellow', 'Fruit'],
  [['lemon', 'lemons'], 'yellow', 'Fruit'],
  [['yellow apple', 'golden apple'], 'yellow', 'Fruit'],
  [['grapefruit'], 'yellow', 'Fruit'],
  [['yellow watermelon'], 'yellow', 'Fruit'],
  [['star fruit', 'starfruit'], 'yellow', 'Fruit'],
  [['golden kiwi'], 'yellow', 'Fruit'],
  [['fig', 'figs'], 'purple', 'Fruit'],
  [['lychee'], 'red', 'Fruit'],

  // Fruits — green
  [['green apple'], 'green', 'Fruit'],
  [['lime', 'limes'], 'green', 'Fruit'],
  [['kiwi', 'kiwifruit'], 'green', 'Fruit'],
  [['honeydew'], 'green', 'Fruit'],
  [['green grape', 'green grapes'], 'green', 'Fruit'],
  [['pear', 'pears'], 'green', 'Fruit'],
  [['avocado', 'avocados'], 'green', 'Fruit'],
  [['gooseberry', 'gooseberries'], 'green', 'Fruit'],

  // Fruits — blue / purple
  [['blueberry', 'blueberries'], 'blue', 'Fruit'],
  [['blackberry', 'blackberries'], 'purple', 'Fruit'],
  [['plum', 'plums'], 'purple', 'Fruit'],
  [['grape', 'grapes'], 'purple', 'Fruit'],
  [['currant', 'currants', 'black currant'], 'purple', 'Fruit'],
  [['elderberry', 'elderberries'], 'purple', 'Fruit'],
  [['mulberry', 'mulberries'], 'purple', 'Fruit'],
  [['passion fruit', 'passion-fruit', 'passionfruit'], 'purple', 'Fruit'],
  [['dragon fruit', 'dragonfruit'], 'purple', 'Fruit'],

  // Generic fruit fallback (apples default to red, most common variety)
  [['apple', 'apples'], 'red', 'Fruit'],
  [['date', 'dates'], null, 'Fruit'],

  // Legumes
  [['black bean', 'black beans'], null, 'Legume'],
  [['kidney bean', 'kidney beans'], 'red', 'Legume'],
  [['bean', 'beans', 'lentil', 'lentils', 'chickpea', 'chickpeas', 'garbanzo', 'soybean', 'soybeans'], null, 'Legume'],

  // Grains
  [['rice', 'wheat', 'oat', 'oats', 'barley', 'quinoa', 'millet', 'buckwheat', 'rye', 'sorghum', 'amaranth', 'flour'], null, 'Grain'],

  // Nuts & seeds
  [['almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pecan', 'pecans', 'pistachio', 'pistachios', 'peanut', 'peanuts', 'hazelnut', 'hazelnuts', 'seed', 'seeds', 'chia', 'flaxseed', 'sunflower seed', 'pumpkin seed'], null, 'Nut & seed'],

  // Herbs & spices
  [['basil', 'cilantro', 'parsley', 'mint', 'oregano', 'thyme', 'rosemary', 'sage', 'dill', 'tarragon'], 'green', 'Herb & spice'],
  [['cinnamon', 'nutmeg', 'clove', 'cumin', 'paprika'], null, 'Herb & spice'],
];

// Sort once by keyword length (desc) so "sweet potato" is tried before "potato".
const SORTED_ENTRIES = ENTRIES
  .flatMap(([keywords, color, category]) => keywords.map(kw => ({ kw, color, category })))
  .sort((a, b) => b.kw.length - a.kw.length);

export function getPlantColorInfo(foodName: string): PlantColorInfo | null {
  const name = foodName.toLowerCase();
  for (const { kw, color, category } of SORTED_ENTRIES) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`).test(name)) {
      return { color, colorLabel: color ? COLOR_LABEL[color] : null, category };
    }
  }
  return null;
}
