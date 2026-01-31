import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const APPEAL_PROMPT = `You are an AI reviewing an appeal of a prediction resolution.

The original prediction was resolved, but the author believes the resolution was incorrect.
Your job is to:
1. Carefully re-examine the evidence
2. Consider any new information or edge cases
3. Determine if the original resolution should be UPHELD or OVERTURNED

Be thorough but fair. Only overturn if there's clear evidence the original resolution was wrong.

TODAY'S DATE: ${new Date().toISOString()}

Respond with JSON:
{
  "decision": "UPHELD" | "OVERTURNED",
  "newResolution": "TRUE" | "FALSE" (only if OVERTURNED),
  "reasoning": "Detailed explanation of your decision",
  "keyEvidence": "The specific facts that led to this decision"
}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI not configured" },
      { status: 500 }
    );
  }

  try {
    // Get the take
    const take = await prisma.take.findUnique({
      where: { id },
    });

    if (!take) {
      return NextResponse.json({ error: "Take not found" }, { status: 404 });
    }

    // Verify the user is the author
    if (take.clerkUserId !== clerkUserId) {
      return NextResponse.json(
        { error: "Only the author can appeal" },
        { status: 403 }
      );
    }

    // Check if take is resolved
    if (take.status === "PENDING") {
      return NextResponse.json(
        { error: "Cannot appeal a pending take" },
        { status: 400 }
      );
    }

    // Check if already appealed
    if (take.appealStatus) {
      return NextResponse.json(
        { error: "This take has already been appealed" },
        { status: 400 }
      );
    }

    // Mark as appeal pending
    await prisma.take.update({
      where: { id },
      data: { appealStatus: "PENDING" },
    });

    // Run the appeal review
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use best model for appeals
      max_tokens: 1024,
      messages: [
        { role: "system", content: APPEAL_PROMPT },
        {
          role: "user",
          content: `Please review this appeal:

ORIGINAL PREDICTION: "${take.text}"
SUBJECT: ${take.aiSubject || "Not specified"}
PREDICTION: ${take.aiPrediction || "Not specified"}
RESOLUTION CRITERIA: ${take.aiResolutionCriteria || "Not specified"}

ORIGINAL RESOLUTION: ${take.status === "VERIFIED" ? "TRUE" : "FALSE"}
ORIGINAL REASONING: ${take.resolutionReasoning || "Not provided"}

The author believes this resolution was incorrect. Please carefully re-examine the evidence.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      await prisma.take.update({
        where: { id },
        data: { 
          appealStatus: "UPHELD",
          appealReasoning: "Appeal review failed - original resolution upheld by default",
        },
      });
      return NextResponse.json({ 
        decision: "UPHELD",
        reasoning: "Appeal review failed" 
      });
    }

    const result = JSON.parse(content);

    if (result.decision === "OVERTURNED") {
      // Change the resolution
      const newStatus = result.newResolution === "TRUE" ? "VERIFIED" : "WRONG";
      const oldStatus = take.status;

      await prisma.take.update({
        where: { id },
        data: {
          status: newStatus,
          appealStatus: "OVERTURNED",
          appealReasoning: `${result.reasoning}\n\nKey Evidence: ${result.keyEvidence}`,
          resolutionReasoning: `[OVERTURNED ON APPEAL] ${result.reasoning}`,
        },
      });

      // Update user win/loss record
      if (take.clerkUserId) {
        // Reverse the old outcome
        if (oldStatus === "VERIFIED") {
          await prisma.user.update({
            where: { clerkId: take.clerkUserId },
            data: { wins: { decrement: 1 }, losses: { increment: 1 } },
          });
        } else {
          await prisma.user.update({
            where: { clerkId: take.clerkUserId },
            data: { wins: { increment: 1 }, losses: { decrement: 1 } },
          });
        }
      }

      return NextResponse.json({
        decision: "OVERTURNED",
        newStatus,
        reasoning: result.reasoning,
        keyEvidence: result.keyEvidence,
      });
    } else {
      // Uphold original resolution
      await prisma.take.update({
        where: { id },
        data: {
          appealStatus: "UPHELD",
          appealReasoning: `${result.reasoning}\n\nKey Evidence: ${result.keyEvidence}`,
        },
      });

      return NextResponse.json({
        decision: "UPHELD",
        reasoning: result.reasoning,
        keyEvidence: result.keyEvidence,
      });
    }
  } catch (error) {
    console.error("Appeal error:", error);
    return NextResponse.json(
      { error: `Appeal failed: ${error}` },
      { status: 500 }
    );
  }
}
