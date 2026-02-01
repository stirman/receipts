import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();

  try {
    // Get recently resolved takes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const resolvedTakes = await prisma.take.findMany({
      where: {
        status: {
          in: ["VERIFIED", "WRONG"],
        },
        resolvedAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        user: {
          select: {
            username: true,
            imageUrl: true,
          },
        },
        agreements: userId ? {
          where: {
            user: {
              clerkId: userId,
            },
          },
          select: {
            position: true,
          },
        } : false,
        _count: {
          select: {
            agreements: true,
          },
        },
      },
      orderBy: {
        resolvedAt: "desc",
      },
      take: 50,
    });

    // Get agreement counts for each take
    const takesWithCounts = await Promise.all(
      resolvedTakes.map(async (take) => {
        const [agreeCount, disagreeCount] = await Promise.all([
          prisma.agreement.count({
            where: { takeId: take.id, position: "AGREE" },
          }),
          prisma.agreement.count({
            where: { takeId: take.id, position: "DISAGREE" },
          }),
        ]);

        return {
          ...take,
          author: take.user?.username || take.author,
          authorImage: take.user?.imageUrl || null,
          userPosition: take.agreements?.[0]?.position || null,
          agreeCount,
          disagreeCount,
        };
      })
    );

    return NextResponse.json(takesWithCounts);
  } catch (error) {
    console.error("Error fetching resolved takes:", error);
    return NextResponse.json(
      { error: "Failed to fetch resolved takes" },
      { status: 500 }
    );
  }
}
