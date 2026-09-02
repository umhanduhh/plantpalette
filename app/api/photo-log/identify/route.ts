import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-route-auth';
import { identifyFoodsInPhoto, GeminiIdentifyError } from '@/lib/gemini-food-id';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decoded

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;

  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 });
  }
  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'Unsupported photo format' }, { status: 400 });
  }
  // base64 encodes 3 bytes as 4 chars, so this is a close upper-bound check
  // without actually decoding the payload.
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Photo is too large. Please use a smaller photo.' }, { status: 400 });
  }

  try {
    const items = await identifyFoodsInPhoto(imageBase64, mimeType);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof GeminiIdentifyError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error('Photo identify error:', error);
    return NextResponse.json({ error: 'Photo identification failed. Please try again.' }, { status: 500 });
  }
}
