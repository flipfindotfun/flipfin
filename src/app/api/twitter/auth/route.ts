import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  // We use OAuth2 with PKCE
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://flipfin.fun";
    
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      `${baseUrl}/api/twitter/callback`,
      { scope: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'], state: wallet }
    );


  const response = NextResponse.redirect(url);

  // Store codeVerifier in a cookie to use in the callback
  response.cookies.set('twitter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });

  return response;
}
