import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

// Admin emails
const ADMIN_EMAILS = ["stirman@gmail.com"];

export async function GET() {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json({ isAdmin: false });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  
  const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail.toLowerCase()) : false;
  
  return NextResponse.json({ isAdmin });
}
