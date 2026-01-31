import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

// Generate PKCE challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

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
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Twitter API not configured" },
      { status: 500 }
    );
  }

  try {
    // Get the callback URL from the request
    const baseUrl = request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;
    
    // Get the takeId from query params if present
    const takeId = request.nextUrl.searchParams.get("takeId");

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // Build OAuth 2.0 URL manually
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: "tweet.read tweet.write users.read",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    console.log("Twitter OAuth URL:", authUrl);
    console.log("Client ID:", clientId);
    console.log("Callback URL:", callbackUrl);

    // Store values in cookies for the callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
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
