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
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  
  const storedState = request.cookies.get("twitter_oauth_state")?.value;
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;
  const redirectTakeId = request.cookies.get("twitter_redirect_take")?.value;

  // Handle OAuth errors from Twitter
  if (error) {
    console.error("Twitter OAuth error:", error, errorDescription);
    return NextResponse.redirect(new URL(`/?error=twitter_oauth_denied&message=${encodeURIComponent(errorDescription || error)}`, request.url));
  }

  if (!code || !state || !storedState || !codeVerifier) {
    console.error("Missing OAuth params:", { code: !!code, state: !!state, storedState: !!storedState, codeVerifier: !!codeVerifier });
    return NextResponse.redirect(new URL("/?error=twitter_oauth_failed", request.url));
  }

  if (state !== storedState) {
    console.error("State mismatch:", { state, storedState });
    return NextResponse.redirect(new URL("/?error=twitter_state_mismatch", request.url));
  }

  try {
    // Get the callback URL
    const baseUrl = request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;

    // Exchange code for tokens using Basic auth
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorData);
      return NextResponse.redirect(new URL("/?error=twitter_token_failed", request.url));
    }

    const tokens = await tokenResponse.json();
    const { access_token: accessToken, refresh_token: refreshToken } = tokens;

    // Create a client with the access token to get user info
    const userClient = new TwitterApi(accessToken);
    const { data: twitterUser } = await userClient.v2.me();

    // Store tokens in database
    await prisma.user.update({
      where: { clerkId: clerkUserId },
      data: {
        twitterId: twitterUser.id,
        twitterUsername: twitterUser.username,
        twitterAccessToken: accessToken,
        twitterAccessSecret: refreshToken || null,
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
