import { createClient } from '@supabase/supabase-js';

// The app's client-side auth (lib/supabase.ts) persists the session in
// localStorage, not cookies, so API routes can't rely on the cookie-based
// SSR client to see who's logged in. The client sends its access token
// explicitly instead, and this validates it against Supabase directly.
export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}
