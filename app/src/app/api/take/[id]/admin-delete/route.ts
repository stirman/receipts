import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Admin emails that can delete any take
const ADMIN_EMAILS = ["stirman@gmail.com"];

export async function DELETE(
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

  // Get user's email to check admin status
  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { id: takeId } = await params;

  try {
    // Delete the take (agreements will cascade delete due to schema)
    await prisma.take.delete({
      where: { id: takeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting take:", error);
    return NextResponse.json(
      { error: "Failed to delete take" },
      { status: 500 }
    );
  }
}
