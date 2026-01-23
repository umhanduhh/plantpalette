import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
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

      // Redirect to confirm page with tokens in URL fragment
      const redirectUrl = `${origin}/auth/confirm#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}&token_type=bearer`;
      return NextResponse.redirect(redirectUrl);
    }

    console.error('No valid auth parameters provided');
    return NextResponse.redirect(`${origin}/auth/error`);

  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(`${origin}/auth/error`);
  }
}
