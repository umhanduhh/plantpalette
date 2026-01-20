import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');

  // Log all parameters for debugging
  console.log('Callback received:', {
    token_hash: token_hash ? 'present' : 'missing',
    type,
    code: code ? 'present' : 'missing',
    allParams: Object.fromEntries(searchParams.entries())
  });

  // Create a Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Handle token_hash from email links (magiclink, recovery, etc.)
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

      console.log('Token auth successful, redirecting to confirm page');

      // Redirect to client-side confirmation page with session tokens in URL fragment
      const redirectUrl = `${origin}/auth/confirm#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}&token_type=bearer`;

      return NextResponse.redirect(redirectUrl);
    }

    // Handle code from PKCE flow
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Code exchange error:', error.message);
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      if (!data.session) {
        console.error('No session returned');
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      console.log('Code auth successful, redirecting to dashboard');
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