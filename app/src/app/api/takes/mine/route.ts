import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

// Helper to get agree/disagree counts for takes
async function getAgreementCounts(takeIds: string[]) {
  if (takeIds.length === 0) return new Map<string, { agreeCount: number; disagreeCount: number }>();
  
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
  
  return countsMap;
}

// GET /api/takes/mine - Fetch current user's takes
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sort = searchParams.get("sort") || "recent"; // "recent" or "engagement"

    const takes = await prisma.take.findMany({
      where: { clerkUserId },
      orderBy: sort === "engagement" 
        ? { agreements: { _count: "desc" } }
        : { createdAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: { agreements: true },
        },
      },
    });

    const takeIds = takes.map(t => t.id);
    const countsMap = await getAgreementCounts(takeIds);

    // Calculate accuracy stats
    const resolvedTakes = takes.filter(t => t.status !== "PENDING");
    const correctTakes = resolvedTakes.filter(t => t.status === "VERIFIED");
    const accuracy = resolvedTakes.length > 0 
      ? Math.round((correctTakes.length / resolvedTakes.length) * 100)
      : null;

    const formattedTakes = takes.map((take) => ({
      id: take.id,
      text: take.text,
      author: take.author,
      hash: take.hash,
      status: take.status,
      createdAt: take.createdAt.toISOString(),
      lockedAt: take.lockedAt.toISOString(),
      resolvesAt: take.resolvesAt?.toISOString() || null,
      resolvedAt: take.resolvedAt?.toISOString() || null,
      clerkUserId: take.clerkUserId,
      aiVerified: take.aiVerified,
      aiSubject: take.aiSubject,
      aiPrediction: take.aiPrediction,
      aiTimeframe: take.aiTimeframe,
      aiResolutionCriteria: take.aiResolutionCriteria,
      engagementCount: take._count.agreements,
      userPosition: null, // Own takes don't have a position
      agreeCount: countsMap.get(take.id)?.agreeCount || 0,
      disagreeCount: countsMap.get(take.id)?.disagreeCount || 0,
    }));

    return NextResponse.json({
      takes: formattedTakes,
      stats: {
        total: takes.length,
        pending: takes.filter(t => t.status === "PENDING").length,
        correct: correctTakes.length,
        incorrect: resolvedTakes.length - correctTakes.length,
        accuracy,
      },
    });
  } catch (error) {
    console.error("Error fetching user takes:", error);
    return NextResponse.json(
      { error: "Failed to fetch takes" },
      { status: 500 }
    );
  }
}
