import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cookie-based browser client so the session is shared with the server-side
// auth callback (PKCE code exchange) and refreshed by the proxy/middleware.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
});
