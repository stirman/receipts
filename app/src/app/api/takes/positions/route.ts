import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

// GET /api/takes/positions - Fetch takes where user has taken a position
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user's internal ID
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ takes: [], stats: { total: 0, correct: 0, incorrect: 0, pending: 0, accuracy: null } });
    }

    // Get all agreements by this user (excluding their own takes)
    const agreements = await prisma.agreement.findMany({
      where: { 
        userId: user.id,
        take: {
          clerkUserId: { not: clerkUserId }, // Exclude own takes
        },
      },
      include: {
        take: {
          include: {
            _count: { select: { agreements: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get agreement counts for all takes
    const takeIds = agreements.map(a => a.takeId);
    const agreementCounts = await prisma.agreement.groupBy({
      by: ['takeId', 'position'],
      where: { takeId: { in: takeIds } },
      _count: true,
    });
    
    const countsMap = new Map<string, { agreeCount: number; disagreeCount: number }>();
    for (const count of agreementCounts) {
      const existing = countsMap.get(count.takeId) || { agreeCount: 0, disagreeCount: 0 };
      if (count.position === 'AGREE') {
        existing.agreeCount = count._count;
      } else {
        existing.disagreeCount = count._count;
      }
      countsMap.set(count.takeId, existing);
    }

    // Calculate stats
    const resolvedPositions = agreements.filter(a => a.take.status !== "PENDING");
    const correctPositions = resolvedPositions.filter(a => {
      const wasRight = (a.position === "AGREE" && a.take.status === "VERIFIED") ||
                       (a.position === "DISAGREE" && a.take.status === "WRONG");
      return wasRight;
    });
    
    const accuracy = resolvedPositions.length > 0
      ? Math.round((correctPositions.length / resolvedPositions.length) * 100)
      : null;

    const formattedTakes = agreements.map((agreement) => ({
      id: agreement.take.id,
      text: agreement.take.text,
      author: agreement.take.author,
      hash: agreement.take.hash,
      status: agreement.take.status,
      createdAt: agreement.take.createdAt.toISOString(),
      lockedAt: agreement.take.lockedAt.toISOString(),
      resolvesAt: agreement.take.resolvesAt?.toISOString() || null,
      resolvedAt: agreement.take.resolvedAt?.toISOString() || null,
      clerkUserId: agreement.take.clerkUserId,
      aiVerified: agreement.take.aiVerified,
      aiSubject: agreement.take.aiSubject,
      aiPrediction: agreement.take.aiPrediction,
      aiTimeframe: agreement.take.aiTimeframe,
      aiResolutionCriteria: agreement.take.aiResolutionCriteria,
      userPosition: agreement.position,
      agreeCount: countsMap.get(agreement.takeId)?.agreeCount || 0,
      disagreeCount: countsMap.get(agreement.takeId)?.disagreeCount || 0,
    }));

    return NextResponse.json({
      takes: formattedTakes,
      stats: {
        total: agreements.length,
        pending: agreements.filter(a => a.take.status === "PENDING").length,
        correct: correctPositions.length,
        incorrect: resolvedPositions.length - correctPositions.length,
        accuracy,
      },
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
