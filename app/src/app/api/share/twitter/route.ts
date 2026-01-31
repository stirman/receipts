import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TwitterApi } from "twitter-api-v2";
import { prisma } from "@/lib/db";

// Check if user has Twitter connected
export async function GET() {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json({ connected: false });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { twitterUsername: true, twitterAccessToken: true },
  });

  return NextResponse.json({
    connected: !!(user?.twitterAccessToken),
    username: user?.twitterUsername || null,
  });
}

// Helper to refresh OAuth 2.0 token if needed
async function getValidClient(user: {
  twitterAccessToken: string | null;
  twitterAccessSecret: string | null; // This stores refresh token for OAuth 2.0
}, clerkUserId: string): Promise<TwitterApi | null> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret || !user.twitterAccessToken) {
    return null;
  }

  // Try using the current access token
  let client = new TwitterApi(user.twitterAccessToken);
  
  try {
    // Test if the token is still valid
    await client.v2.me();
    return client;
  } catch (error: unknown) {
    // If token expired and we have a refresh token, try to refresh
    const err = error as { code?: number };
    if (err.code === 401 && user.twitterAccessSecret) {
      try {
        const refreshClient = new TwitterApi({
          clientId,
          clientSecret,
        });
        
        const { accessToken, refreshToken } = await refreshClient.refreshOAuth2Token(
          user.twitterAccessSecret
        );
        
        // Update tokens in database
        await prisma.user.update({
          where: { clerkId: clerkUserId },
          data: {
            twitterAccessToken: accessToken,
            twitterAccessSecret: refreshToken || user.twitterAccessSecret,
          },
        });
        
        return new TwitterApi(accessToken);
      } catch {
        // Refresh failed, user needs to re-auth
        return null;
      }
    }
    return null;
  }
}

// Share to Twitter
export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { takeId, text } = body;

    if (!takeId) {
      return NextResponse.json(
        { error: "takeId is required" },
        { status: 400 }
      );
    }

    // Get user's Twitter tokens
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { 
        twitterAccessToken: true, 
        twitterAccessSecret: true,
        twitterUsername: true,
      },
    });

    if (!user?.twitterAccessToken) {
      return NextResponse.json(
        { error: "Twitter not connected", needsAuth: true },
        { status: 401 }
      );
    }

    // Get a valid client (refreshes token if needed)
    const client = await getValidClient(user, clerkUserId);
    
    if (!client) {
      return NextResponse.json(
        { error: "Twitter authentication expired", needsAuth: true },
        { status: 401 }
      );
    }

    // Get the take URL
    const baseUrl = request.nextUrl.origin;
    const takeUrl = `${baseUrl}/take/${takeId}`;
    const tweetText = text || `Check out this take 🧾\n\n${takeUrl}`;

    // Post tweet (without media for now - OAuth 2.0 media upload requires different approach)
    // The receipt card will show via Twitter's link preview
    const tweet = await client.v2.tweet({
      text: tweetText,
    });

    return NextResponse.json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/${user.twitterUsername}/status/${tweet.data.id}`,
    });
  } catch (error) {
    console.error("Twitter share error:", error);
    return NextResponse.json(
      { error: "Failed to share to Twitter" },
      { status: 500 }
    );
  }
}
