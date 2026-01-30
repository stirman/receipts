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

// Share to Twitter with image
export async function POST(request: NextRequest) {
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

    if (!user?.twitterAccessToken || !user?.twitterAccessSecret) {
      return NextResponse.json(
        { error: "Twitter not connected", needsAuth: true },
        { status: 401 }
      );
    }

    // Create Twitter client with user's tokens
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: user.twitterAccessToken,
      accessSecret: user.twitterAccessSecret,
    });

    // Get the receipt image
    const baseUrl = request.nextUrl.origin;
    const imageResponse = await fetch(`${baseUrl}/api/og/${takeId}`);
    
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to generate receipt image" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload media to Twitter
    const mediaId = await client.v1.uploadMedia(imageBuffer, {
      mimeType: "image/png",
    });

    // Get the take URL
    const takeUrl = `${baseUrl}/take/${takeId}`;
    const tweetText = text || `Check out this take 🧾\n\n${takeUrl}`;

    // Post tweet with media
    const tweet = await client.v2.tweet({
      text: tweetText,
      media: { media_ids: [mediaId] },
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
