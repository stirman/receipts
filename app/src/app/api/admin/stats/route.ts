import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

const ADMIN_USERNAMES = ["stirman"];

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const username = user?.username?.toLowerCase();
    
    if (!username || !ADMIN_USERNAMES.includes(username)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get take stats
    const takes = await prisma.take.groupBy({
      by: ['status'],
      _count: true,
    });

    const takeStats = {
      total: 0,
      pending: 0,
      verified: 0,
      wrong: 0,
    };

    for (const t of takes) {
      takeStats.total += t._count;
      if (t.status === "PENDING") takeStats.pending = t._count;
      if (t.status === "VERIFIED") takeStats.verified = t._count;
      if (t.status === "WRONG") takeStats.wrong = t._count;
    }

    // Get user count
    const userCount = await prisma.user.count();

    // Get agreement count
    const agreementCount = await prisma.agreement.count();

    // Estimate API calls based on data
    // Every take = 1 verify call
    // Assume 10% of takes needed "make it clearer" = suggest calls
    // Resolved takes = resolve calls
    // Assume 5% of resolved = appeals
    const apiCalls = {
      verify: takeStats.total,
      suggest: Math.round(takeStats.total * 0.1),
      resolve: takeStats.verified + takeStats.wrong,
      appeal: Math.round((takeStats.verified + takeStats.wrong) * 0.05),
    };

    return NextResponse.json({
      takes: takeStats,
      users: userCount,
      agreements: agreementCount,
      apiCalls,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
