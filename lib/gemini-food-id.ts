import { PLANT_COLOR_EXAMPLES, PLANT_COLOR_KEYS, PlantColorKey, isPlantColorKey } from './plant-colors';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface IdentifiedFoodItem {
  food_name: string;
  estimated_color: PlantColorKey | null; // null = "other" (no rainbow color) or an unrecognized value
  confidence: number;                    // clamped to [0, 1]
  visual_description: string;
}

// "other" gives the model a legal place to put foods with no rainbow color
// (grains, plain proteins, nuts, dairy) instead of forcing a wrong guess.
const COLOR_ENUM_VALUES = [...PLANT_COLOR_KEYS, 'other'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          food_name: { type: 'STRING' },
          estimated_color: { type: 'STRING', enum: COLOR_ENUM_VALUES },
          confidence: { type: 'NUMBER' },
          visual_description: { type: 'STRING' },
        },
        required: ['food_name', 'estimated_color', 'confidence', 'visual_description'],
      },
    },
  },
  required: ['items'],
};

function buildPrompt(): string {
  const colorList = PLANT_COLOR_KEYS
    .map(color => `  - ${color}: e.g. ${PLANT_COLOR_EXAMPLES[color].join(', ')}`)
    .join('\n');

  return `You are looking at a photo of a plate of food. Identify every visually distinct food item on the plate — list each one separately rather than lumping the plate into one item (e.g. "grilled chicken", "steamed broccoli", "brown rice", not "dinner plate").

For each item, provide:
- food_name: a plain, singular food name (e.g. "Steamed Broccoli", not "veggies")
- estimated_color: pick the ONE category below that best matches the item's dominant visual color. Use "other" only if the food has no distinctive produce color (grains, plain proteins, nuts, dairy, oils).
${colorList}
- confidence: your confidence (0.0-1.0) that you've correctly identified this food and its color from the image
- visual_description: a short (under 10 words), user-facing description of what you see (e.g. "diced roasted sweet potato")

If no food is visible on the plate, return an empty items array.`;
}

function clampColor(raw: unknown): PlantColorKey | null {
  return isPlantColorKey(raw) ? raw : null;
}

function clampConfidence(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export class GeminiIdentifyError extends Error {}

// Calls Gemini 2.5 Flash-Lite with a strict JSON response schema and
// returns the validated, defensively-clamped item list. Never returns a
// value outside our own color taxonomy, even if the model violates the
// schema — an unrecognized or missing color is coerced to null ("other").
export async function identifyFoodsInPhoto(imageBase64: string, mimeType: string): Promise<IdentifiedFoodItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiIdentifyError('GEMINI_API_KEY is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: buildPrompt() },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new GeminiIdentifyError('Could not reach the photo-identification service. Please try again.');
  }

  if (!response.ok) {
    throw new GeminiIdentifyError(
      response.status === 429
        ? 'Photo identification is busy right now. Please try again in a moment.'
        : 'Photo identification failed. Please try again.'
    );
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];

  if (candidate?.finishReason === 'SAFETY') {
    throw new GeminiIdentifyError('That photo couldn\'t be processed. Please try a different photo.');
  }

  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiIdentifyError('Photo identification returned no result. Please try again.');
  }

  let parsed: { items?: unknown[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiIdentifyError('Photo identification returned an unexpected response. Please try again.');
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return items
    .map((raw): IdentifiedFoodItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const foodName = typeof item.food_name === 'string' ? item.food_name.trim() : '';
      if (!foodName) return null;

      return {
        food_name: foodName,
        estimated_color: clampColor(item.estimated_color),
        confidence: clampConfidence(item.confidence),
        visual_description: typeof item.visual_description === 'string' ? item.visual_description.trim() : '',
      };
    })
    .filter((item): item is IdentifiedFoodItem => item !== null);
}
