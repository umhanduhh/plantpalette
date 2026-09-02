import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchFoodToFdc, customFoodId } from '@/lib/usda-api';

const MAX_ITEMS = 25;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.FDC_API_KEY;
  if (!apiKey) {
    console.error('FDC_API_KEY is not configured.');
    return NextResponse.json({ error: 'Nutrition lookup is not configured.' }, { status: 500 });
  }

  let body: { food_names?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const foodNames = Array.isArray(body.food_names)
    ? body.food_names.filter((n): n is string => typeof n === 'string' && n.trim().length > 0).slice(0, MAX_ITEMS)
    : [];

  if (foodNames.length === 0) {
    return NextResponse.json({ error: 'No food names provided' }, { status: 400 });
  }

  // Each food is matched independently — one FDC lookup failing (rate
  // limit, transient network error) shouldn't take down the rest of the
  // batch. A failed lookup falls back to the same "no match" shape as a
  // genuine zero-result search, so the food still gets logged, just
  // without nutrient data.
  const results = await Promise.all(
    foodNames.map(async (foodName) => {
      try {
        return { food_name: foodName, ...(await matchFoodToFdc(foodName, apiKey)) };
      } catch (error) {
        console.error(`FDC match failed for "${foodName}":`, error);
        return {
          food_name: foodName,
          fdcId: customFoodId(foodName),
          food_data_type: 'Custom',
          food_nutrients: [],
          matched: false,
        };
      }
    })
  );

  return NextResponse.json({ matches: results });
}
