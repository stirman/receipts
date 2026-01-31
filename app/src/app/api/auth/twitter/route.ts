import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TwitterApi } from "twitter-api-v2";

// Start Twitter OAuth 2.0 flow with PKCE
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Twitter API not configured" },
      { status: 500 }
    );
  }

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Get the callback URL from the request
    const baseUrl = request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;
    
    // Get the takeId from query params if present (to redirect back after auth)
    const takeId = request.nextUrl.searchParams.get("takeId");

    // Generate OAuth 2.0 link with PKCE
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      callbackUrl,
      { 
        scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      }
    );

    // Store codeVerifier and state in cookies for the callback
    const response = NextResponse.redirect(url);
    response.cookies.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });
    response.cookies.set("twitter_oauth_state", state, {
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
