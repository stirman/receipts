import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TwitterApi } from "twitter-api-v2";
import { prisma } from "@/lib/db";

// Handle Twitter OAuth callback
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.redirect(new URL("/?error=auth_required", request.url));
  }

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    return NextResponse.redirect(new URL("/?error=twitter_not_configured", request.url));
  }

  // Get OAuth tokens from query and cookies
  const oauthToken = request.nextUrl.searchParams.get("oauth_token");
  const oauthVerifier = request.nextUrl.searchParams.get("oauth_verifier");
  const storedToken = request.cookies.get("twitter_oauth_token")?.value;
  const storedSecret = request.cookies.get("twitter_oauth_token_secret")?.value;
  const redirectTakeId = request.cookies.get("twitter_redirect_take")?.value;

  if (!oauthToken || !oauthVerifier || !storedToken || !storedSecret) {
    return NextResponse.redirect(new URL("/?error=twitter_oauth_failed", request.url));
  }

  if (oauthToken !== storedToken) {
    return NextResponse.redirect(new URL("/?error=twitter_token_mismatch", request.url));
  }

  try {
    // Exchange for access tokens
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: oauthToken,
      accessSecret: storedSecret,
    });

    const { accessToken, accessSecret, screenName, userId: twitterId } = 
      await client.login(oauthVerifier);

    // Store tokens in database
    await prisma.user.update({
      where: { clerkId: clerkUserId },
      data: {
        twitterId,
        twitterUsername: screenName,
        twitterAccessToken: accessToken,
        twitterAccessSecret: accessSecret,
      },
    });

    // Clear cookies
    const redirectUrl = redirectTakeId 
      ? `/take/${redirectTakeId}?twitter=connected`
      : "/?twitter=connected";
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.delete("twitter_oauth_token");
    response.cookies.delete("twitter_oauth_token_secret");
    response.cookies.delete("twitter_redirect_take");

    return response;
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=twitter_oauth_failed", request.url));
  }
}
