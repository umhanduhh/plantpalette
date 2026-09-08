import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/supabase-route-auth';

const MAX_FIELD_LENGTH = 512;

export async function POST(request: Request) {
  let body: { path?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, MAX_FIELD_LENGTH) : null;
  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, MAX_FIELD_LENGTH) : null;

  // Best-effort: attach the signed-in user if a token was sent, but a
  // missing/invalid token should never block logging the view.
  const user = await getUserFromRequest(request).catch(() => null);

  const { error } = await supabase.from('page_views').insert({
    path,
    referrer,
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error('Failed to log page view:', error);
    return NextResponse.json({ error: 'Failed to log page view' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
