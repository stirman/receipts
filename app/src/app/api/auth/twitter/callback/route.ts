import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TwitterApi } from "twitter-api-v2";
import { prisma } from "@/lib/db";

// Handle Twitter OAuth 2.0 callback
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.redirect(new URL("/?error=auth_required", request.url));
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?error=twitter_not_configured", request.url));
  }

  // Get OAuth 2.0 params from query and cookies
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("twitter_oauth_state")?.value;
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;
  const redirectTakeId = request.cookies.get("twitter_redirect_take")?.value;

  if (!code || !state || !storedState || !codeVerifier) {
    return NextResponse.redirect(new URL("/?error=twitter_oauth_failed", request.url));
  }

  if (state !== storedState) {
    return NextResponse.redirect(new URL("/?error=twitter_state_mismatch", request.url));
  }

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Get the callback URL
    const baseUrl = request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;

    // Exchange code for tokens
    const { accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    // Create a client with the access token to get user info
    const userClient = new TwitterApi(accessToken);
    const { data: twitterUser } = await userClient.v2.me();

    // Store tokens in database
    // Using twitterAccessToken for the OAuth 2.0 access token
    // Using twitterAccessSecret for the refresh token (repurposed field)
    await prisma.user.update({
      where: { clerkId: clerkUserId },
      data: {
        twitterId: twitterUser.id,
        twitterUsername: twitterUser.username,
        twitterAccessToken: accessToken,
        twitterAccessSecret: refreshToken || null, // Store refresh token here
      },
    });

    // Clear cookies and redirect
    const redirectUrl = redirectTakeId 
      ? `/take/${redirectTakeId}?twitter=connected`
      : "/?twitter=connected";
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_oauth_state");
    response.cookies.delete("twitter_redirect_take");

    return response;
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=twitter_oauth_failed", request.url));
  }
}
