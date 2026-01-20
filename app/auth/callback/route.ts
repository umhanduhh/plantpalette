import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Log all parameters for debugging
  console.log('Callback received:', {
    code: code ? 'present' : 'missing',
    token_hash: token_hash ? 'present' : 'missing',
    type,
    allParams: Object.fromEntries(searchParams.entries())
  });

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
    // Handle PKCE code exchange (preferred - confirmation link flow)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Code exchange error:', error.message);
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      console.log('Code auth successful, redirecting to dashboard');
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Fallback: Handle token_hash from email links (legacy magiclink flow)
    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (error) {
        console.error('Token verification error:', error.message);
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      if (!data.session) {
        console.error('No session returned from verifyOtp');
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      console.log('Token auth successful, redirecting to dashboard');
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // No valid auth parameters provided
    console.error('No valid auth parameters provided');
    return NextResponse.redirect(`${origin}/auth/error`);

  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(`${origin}/auth/error`);
  }
}
