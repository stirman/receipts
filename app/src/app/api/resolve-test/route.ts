import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

// Temporary test endpoint for resolution
// TODO: Move this logic to /api/cron/resolve once deployment issue is fixed

const RESOLUTION_PROMPT = `You are an AI that determines whether predictions have come true.

TODAY'S DATE AND TIME: ${new Date().toISOString()}

You will be given a prediction with its resolution criteria. Your job is to:
1. Search your knowledge for relevant information
2. Determine if the prediction is TRUE, FALSE, or UNDETERMINED
3. Provide clear reasoning with sources/facts

IMPORTANT RULES:
- Only mark as TRUE if there is clear evidence the prediction came true
- Only mark as FALSE if there is clear evidence it did NOT come true  
- Mark as UNDETERMINED if you cannot find sufficient information
- Be objective and cite specific facts, scores, prices, announcements, etc.
- If the event hasn't happened yet (even if past resolution date), mark UNDETERMINED

Respond with JSON:
{
  "resolution": "TRUE" | "FALSE" | "UNDETERMINED",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Detailed explanation with specific facts, dates, scores, etc.",
  "sources": "What information sources you used (e.g., 'NBA official results', 'Bitcoin price data')"
}`;

async function resolveTake(
  openai: OpenAI,
  take: {
    id: string;
    text: string;
    aiSubject: string | null;
    aiPrediction: string | null;
    aiResolutionCriteria: string | null;
  }
): Promise<{ status: "VERIFIED" | "WRONG" | null; reasoning: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: RESOLUTION_PROMPT },
        {
          role: "user",
          content: `Please determine if this prediction has come true:

PREDICTION: "${take.text}"
SUBJECT: ${take.aiSubject || "Not specified"}
WHAT WAS PREDICTED: ${take.aiPrediction || "Not specified"}
RESOLUTION CRITERIA: ${take.aiResolutionCriteria || "Not specified"}

Has this prediction come true?`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { status: null, reasoning: "AI failed to provide a response" };
    }

    const result = JSON.parse(content);
    
    if (result.confidence === "LOW" || result.resolution === "UNDETERMINED") {
      return { 
        status: null, 
        reasoning: `Unable to determine with confidence: ${result.reasoning}` 
      };
    }

    return {
      status: result.resolution === "TRUE" ? "VERIFIED" : "WRONG",
      reasoning: `${result.reasoning}\n\nSources: ${result.sources}`,
    };
  } catch (error) {
    console.error("Error resolving take:", take.id, error);
    return { status: null, reasoning: `Resolution error: ${error}` };
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const now = new Date();
    const pendingTakes = await prisma.take.findMany({
      where: {
        status: "PENDING",
        resolvesAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        text: true,
        aiSubject: true,
        aiPrediction: true,
        aiResolutionCriteria: true,
      },
      take: 10,
    });

    console.log(`Found ${pendingTakes.length} takes to resolve`);

    const results = [];

    for (const take of pendingTakes) {
      console.log(`Resolving take: ${take.id}`);
      const { status, reasoning } = await resolveTake(openai, take);

      if (status) {
        await prisma.take.update({
          where: { id: take.id },
          data: {
            status,
            resolvedAt: now,
            resolutionReasoning: reasoning,
          },
        });

        const fullTake = await prisma.take.findUnique({
          where: { id: take.id },
          select: { clerkUserId: true },
        });

        if (fullTake?.clerkUserId) {
          await prisma.user.update({
            where: { clerkId: fullTake.clerkUserId },
            data: {
              wins: status === "VERIFIED" ? { increment: 1 } : undefined,
              losses: status === "WRONG" ? { increment: 1 } : undefined,
            },
          });
        }

        results.push({
          takeId: take.id,
          text: take.text,
          status,
          reasoning: reasoning.substring(0, 300) + "...",
        });
      } else {
        results.push({
          takeId: take.id,
          text: take.text,
          status: "SKIPPED",
          reasoning: reasoning.substring(0, 300) + "...",
        });
      }
    }

    return NextResponse.json({
      processed: pendingTakes.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Resolution error:", error);
    return NextResponse.json(
      { error: `Resolution failed: ${error}` },
      { status: 500 }
    );
  }
}
