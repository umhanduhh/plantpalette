import { USDASearchResponse } from './types';

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY!;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export async function searchFoods(query: string, pageSize: number = 10): Promise<USDASearchResponse> {
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch foods from USDA API');
    }

    const data = await response.json();
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
