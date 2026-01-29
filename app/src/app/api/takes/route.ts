import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";

// GET /api/takes - Fetch all takes
export async function GET() {
  try {
    const takes = await prisma.take.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(takes);
  } catch (error) {
    console.error("Error fetching takes:", error);
    return NextResponse.json(
      { error: "Failed to fetch takes" },
      { status: 500 }
    );
  }
}

// POST /api/takes - Create a new take
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, author, verification } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Take text is required" },
        { status: 400 }
      );
    }

    if (text.length > 280) {
      return NextResponse.json(
        { error: "Take must be 280 characters or less" },
        { status: 400 }
      );
    }

    // Get authenticated user (optional - takes can be anonymous)
    const { userId: clerkUserId } = await auth();
    const user = clerkUserId ? await currentUser() : null;

    // Use authenticated username if available, otherwise use provided author
    const authorName =
      user?.username || user?.firstName || author || "Anonymous";

    // Create hash for integrity verification
    const hash = crypto
      .createHash("sha256")
      .update(text + Date.now().toString())
      .digest("hex")
      .substring(0, 16);

    // Parse resolution date from verification
    let resolvesAt: Date | null = null;
    if (verification?.suggestedResolutionDate) {
      resolvesAt = new Date(verification.suggestedResolutionDate);
    }

    // If user is authenticated, ensure they exist in our DB or create them
    if (clerkUserId && user) {
      await prisma.user.upsert({
        where: { clerkId: clerkUserId },
        update: {
          username: user.username || user.firstName || "User",
          email: user.emailAddresses?.[0]?.emailAddress || null,
          imageUrl: user.imageUrl || null,
        },
        create: {
          clerkId: clerkUserId,
          username: user.username || user.firstName || "User",
          email: user.emailAddresses?.[0]?.emailAddress || null,
          imageUrl: user.imageUrl || null,
        },
      });
    }

    const take = await prisma.take.create({
      data: {
        text: text.trim(),
        author: authorName,
        hash,
        lockedAt: new Date(),
        resolvesAt,
        // AI verification fields
        aiVerified: verification?.isVerifiable || false,
        aiSubject: verification?.subject || null,
        aiPrediction: verification?.prediction || null,
        aiTimeframe: verification?.timeframe || null,
        aiResolutionCriteria: verification?.resolutionCriteria || null,
        // Link to user if authenticated
        clerkUserId: clerkUserId || null,
      },
    });

    return NextResponse.json(take, { status: 201 });
  } catch (error) {
    console.error("Error creating take:", error);
    return NextResponse.json(
      { error: "Failed to create take" },
      { status: 500 }
    );
  }
}
