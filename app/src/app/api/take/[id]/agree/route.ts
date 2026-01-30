import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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
    // Get the take to verify it exists and is still pending
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
        { error: "Cannot agree on a resolved take" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      // Create user if doesn't exist
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

    // Create new agreement (positions are permanent)
    const agreement = await prisma.agreement.create({
      data: {
        takeId,
        userId: user.id,
        position: "AGREE",
      },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error("Error creating agreement:", error);
    return NextResponse.json(
      { error: "Failed to record agreement" },
      { status: 500 }
    );
  }
}

// Remove DELETE endpoint - positions are now permanent
