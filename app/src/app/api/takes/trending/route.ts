import { NextResponse } from "next/server";
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

// GET /api/takes/trending - Fetch trending takes (most engagement today, fallback to recent)
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    // Get current user's ID if logged in
    let currentUserId: string | null = null;
    if (clerkUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id || null;
    }

    // Get start of today (midnight UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // First, try to get takes with engagement today
    const takesWithTodayEngagement = await prisma.take.findMany({
      where: {
        agreements: {
          some: {
            createdAt: { gte: today },
          },
        },
      },
      include: {
        _count: {
          select: { agreements: true },
        },
        agreements: currentUserId ? {
          where: { userId: currentUserId },
          select: { position: true },
        } : { take: 0 },
      },
      orderBy: {
        agreements: { _count: "desc" },
      },
      take: 50,
    });

    // Helper function to format takes
    const formatTakes = async (rawTakes: typeof takesWithTodayEngagement) => {
      const takeIds = rawTakes.map(t => t.id);
      const countsMap = await getAgreementCounts(takeIds);
      
      return rawTakes.map((take) => ({
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
        userPosition: currentUserId && take.agreements.length > 0 ? take.agreements[0].position : null,
        agreeCount: countsMap.get(take.id)?.agreeCount || 0,
        disagreeCount: countsMap.get(take.id)?.disagreeCount || 0,
      }));
    };

    // If we have takes with today's engagement, use those
    if (takesWithTodayEngagement.length > 0) {
      const takes = await formatTakes(takesWithTodayEngagement);
      return NextResponse.json(takes);
    }

    // Fallback: get takes with most total engagement
    const takesWithEngagement = await prisma.take.findMany({
      include: {
        _count: {
          select: { agreements: true },
        },
        agreements: currentUserId ? {
          where: { userId: currentUserId },
          select: { position: true },
        } : { take: 0 },
      },
      orderBy: {
        agreements: { _count: "desc" },
      },
      take: 50,
    });

    // If still no engagement, just get recent takes
    if (takesWithEngagement.length === 0 || takesWithEngagement[0]._count.agreements === 0) {
      const recentTakes = await prisma.take.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          _count: {
            select: { agreements: true },
          },
          agreements: currentUserId ? {
            where: { userId: currentUserId },
            select: { position: true },
          } : { take: 0 },
        },
      });

      const takes = await formatTakes(recentTakes);
      return NextResponse.json(takes);
    }

    const takes = await formatTakes(takesWithEngagement);
    return NextResponse.json(takes);
  } catch (error) {
    console.error("Error fetching trending takes:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending takes" },
      { status: 500 }
    );
  }
}
