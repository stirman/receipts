import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

// Check if taking a position on this take would conflict with existing positions
async function checkForConflictingPosition(
  userId: string,
  take: { id: string; text: string; aiSubject: string | null },
  newPosition: "AGREE" | "DISAGREE"
): Promise<{ hasConflict: boolean; conflictMessage?: string }> {
  // Get user's existing positions on pending takes
  const existingPositions = await prisma.agreement.findMany({
    where: {
      userId,
      take: { status: "PENDING" },
    },
    include: {
      take: {
        select: { id: true, text: true, aiSubject: true },
      },
    },
  });

  if (existingPositions.length === 0) {
    return { hasConflict: false };
  }

  // Use AI to check for conflicts if we have OpenAI configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { hasConflict: false }; // Skip check if no API key
  }

  const openai = new OpenAI({ apiKey });

  // Build context of existing positions
  const existingContext = existingPositions.map(p => 
    `- ${p.position === "AGREE" ? "AGREED" : "DISAGREED"} with: "${p.take.text}"`
  ).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content: `You check if a new position would logically conflict with existing positions.

A conflict exists if:
1. The user would be agreeing with one take and disagreeing with a substantially similar/same take
2. The user would be taking opposite stances on the same prediction

Respond with JSON: { "hasConflict": boolean, "reason": "explanation or null" }`,
        },
        {
          role: "user",
          content: `User's existing positions:\n${existingContext}\n\nNew action: ${newPosition} with "${take.text}"\n\nDoes this conflict with any existing position?`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const result = JSON.parse(content);
      if (result.hasConflict) {
        return {
          hasConflict: true,
          conflictMessage: result.reason || "This conflicts with a position you've already taken.",
        };
      }
    }
  } catch (error) {
    console.error("Error checking for conflicts:", error);
    // Don't block on AI errors
  }

  return { hasConflict: false };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { id: takeId } = await params;

  try {
    const take = await prisma.take.findUnique({
      where: { id: takeId },
    });

    if (!take) {
      return NextResponse.json(
        { error: "Take not found" },
        { status: 404 }
      );
    }

    if (take.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot disagree on a resolved take" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          username: "Anonymous",
        },
      });
    }

    // Check if user already has a position on this take
    const existingAgreement = await prisma.agreement.findUnique({
      where: {
        takeId_userId: {
          takeId,
          userId: user.id,
        },
      },
    });

    if (existingAgreement) {
      return NextResponse.json(
        { error: "Position already locked. You cannot change your stance." },
        { status: 400 }
      );
    }

    // Check for conflicting positions on other takes
    const conflictCheck = await checkForConflictingPosition(
      user.id,
      { id: take.id, text: take.text, aiSubject: take.aiSubject },
      "DISAGREE"
    );

    if (conflictCheck.hasConflict) {
      return NextResponse.json(
        { error: conflictCheck.conflictMessage },
        { status: 400 }
      );
    }

    const agreement = await prisma.agreement.create({
      data: {
        takeId,
        userId: user.id,
        position: "DISAGREE",
      },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error("Error creating disagreement:", error);
    return NextResponse.json(
      { error: "Failed to record disagreement" },
      { status: 500 }
    );
  }
}
