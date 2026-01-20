import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type');
  const code = searchParams.get('code');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // Handle PKCE code from confirmation link
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Code exchange error:', error.message);
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Handle token_hash from magic link
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (error) {
        console.error('Token verification error:', error.message);
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.error('No valid auth parameters provided');
    return NextResponse.redirect(`${origin}/auth/error`);

  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(`${origin}/auth/error`);
  }
}
