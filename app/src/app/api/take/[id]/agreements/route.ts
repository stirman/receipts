import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: takeId } = await params;
  const { userId: clerkUserId } = await auth();

  try {
    // Get all agreements for this take
    const agreements = await prisma.agreement.findMany({
      where: { takeId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            clerkId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Split into agree and disagree
    const agrees = agreements
      .filter((a) => a.position === "AGREE")
      .map((a) => ({
        id: a.id,
        username: a.user.username,
        createdAt: a.createdAt,
      }));

    const disagrees = agreements
      .filter((a) => a.position === "DISAGREE")
      .map((a) => ({
        id: a.id,
        username: a.user.username,
        createdAt: a.createdAt,
      }));

    // Check if current user has an agreement
    let userPosition: "AGREE" | "DISAGREE" | null = null;
    if (clerkUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });
      if (user) {
        const userAgreement = agreements.find((a) => a.userId === user.id);
        if (userAgreement) {
          userPosition = userAgreement.position;
        }
      }
    }

    return NextResponse.json({
      agrees,
      disagrees,
      agreeCount: agrees.length,
      disagreeCount: disagrees.length,
      userPosition,
    });
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return NextResponse.json(
      { error: "Failed to fetch agreements" },
      { status: 500 }
    );
  }
}
