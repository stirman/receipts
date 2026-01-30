import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TwitterApi } from "twitter-api-v2";

// Start Twitter OAuth flow
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Twitter API not configured" },
      { status: 500 }
    );
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
    });

    // Get the callback URL from the request
    const baseUrl = request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;
    
    // Get the takeId from query params if present (to redirect back after auth)
    const takeId = request.nextUrl.searchParams.get("takeId");

    // Generate OAuth link
    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
      callbackUrl,
      { linkMode: "authorize" }
    );

    // Store oauth_token_secret in a cookie for the callback
    // Also store takeId if present
    const response = NextResponse.redirect(url);
    response.cookies.set("twitter_oauth_token", oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });
    response.cookies.set("twitter_oauth_token_secret", oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });
    if (takeId) {
      response.cookies.set("twitter_redirect_take", takeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      });
    }

    return response;
  } catch (error) {
    console.error("Twitter OAuth error:", error);
    return NextResponse.json(
      { error: "Failed to start Twitter OAuth" },
      { status: 500 }
    );
  }
}
