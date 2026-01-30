import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an AI assistant that helps verify and structure predictions ("hot takes") for the Receipts app.

⚠️ CRITICAL: TODAY'S DATE IS ${new Date().toISOString().split("T")[0]}

A prediction is ONLY verifiable if ALL of these are true:
1. It predicts a FUTURE event (after today's date above)
2. The outcome will be objectively true or false (not subjective like "best" or "GOAT")
3. There will be PUBLIC DATA available to verify it (official stats, news, records, prices, etc.)
4. An AI can definitively determine the outcome from publicly available information

REJECT as unverifiable:
- Subjective claims ("X is the best", "X is the GOAT", "X will be amazing")
- Past events (anything with dates before ${new Date().toISOString().split("T")[0]})
- Claims requiring private/non-public information
- Opinion polls or surveys (results aren't objective truth)
- Claims that can't be definitively proven true or false

GOOD verifiable examples:
- "Bitcoin will reach $100,000 by December 2026" (future date, public price data)
- "The Lakers will win the 2026 NBA Championship" (future event, official records)
- "Taylor Swift will release a new album in 2026" (future, verifiable announcement)

BAD examples (mark as NOT verifiable):
- "LeBron is the GOAT" (subjective, no objective measure)
- "Team X will be ranked #1 in a July 2025 poll" (PAST DATE - we are now in ${new Date().toISOString().split("T")[0]})
- "This movie will be considered a classic" (subjective)

You must respond ONLY with valid JSON:
{
  "isVerifiable": boolean,
  "refinedTake": "The refined version (or null if not verifiable or already clear)",
  "subject": "Main subject (e.g., 'Houston Rockets', 'Bitcoin')",
  "prediction": "What is being predicted",
  "timeframe": "Time period (must be FUTURE)",
  "resolutionCriteria": "How we'll verify - must reference PUBLIC DATA source",
  "suggestedResolutionDate": "YYYY-MM-DD format - MUST be after ${new Date().toISOString().split("T")[0]}",
  "explanation": "Brief explanation (shown to user)"
}

Sports seasons reference:
- NBA 2025-26: Regular season ends mid-April 2026, Finals in June 2026
- NFL 2025-26: Regular season ends January 2026, Super Bowl February 2026
- MLB 2026: Season April-October 2026, World Series in October/November`;

const CONFLICT_CHECK_PROMPT = `You are checking if a new prediction contradicts or conflicts with existing predictions from the same user.

A conflict exists if:
1. The new take predicts the OPPOSITE outcome of an existing take on the same subject
2. The new take is logically incompatible with an existing take

Examples of conflicts:
- "Team X will make the playoffs" conflicts with "Team X will miss the playoffs"
- "Bitcoin will hit $100k" conflicts with "Bitcoin will crash below $50k"
- "Movie X will win Best Picture" conflicts with "Movie X will flop at the box office"

NOT conflicts (these are fine):
- Different subjects entirely
- Same direction predictions with different specifics
- Predictions about different time periods

Respond with JSON:
{
  "hasConflict": boolean,
  "conflictingTakeId": "id of the conflicting take or null",
  "conflictingTakeText": "text of the conflicting take or null",
  "explanation": "brief explanation of why they conflict, or null if no conflict"
}`;

async function checkForConflicts(
  openai: OpenAI,
  newTake: string,
  existingTakes: { id: string; text: string }[]
): Promise<{ hasConflict: boolean; conflictingTakeText?: string; explanation?: string }> {
  if (existingTakes.length === 0) {
    return { hasConflict: false };
  }

  const existingTakesText = existingTakes
    .map((t, i) => `${i + 1}. [ID: ${t.id}] "${t.text}"`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: CONFLICT_CHECK_PROMPT },
        {
          role: "user",
          content: `New prediction: "${newTake}"\n\nExisting predictions from this user:\n${existingTakesText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { hasConflict: false };

    const result = JSON.parse(content);
    return {
      hasConflict: result.hasConflict,
      conflictingTakeText: result.conflictingTakeText,
      explanation: result.explanation,
    };
  } catch (error) {
    console.error("Error checking for conflicts:", error);
    return { hasConflict: false }; // Don't block on conflict check errors
  }
}

export async function POST(request: NextRequest) {
  // Check API key first
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not found in environment variables" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { take } = body;

    if (!take || typeof take !== "string") {
      return NextResponse.json(
        { error: "Take text is required" },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Check for conflicting takes if user is authenticated
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (user) {
        // Get user's existing pending takes
        const existingTakes = await prisma.take.findMany({
          where: {
            clerkUserId,
            status: "PENDING",
          },
          select: { id: true, text: true },
        });

        if (existingTakes.length > 0) {
          const conflictCheck = await checkForConflicts(openai, take, existingTakes);
          
          if (conflictCheck.hasConflict) {
            return NextResponse.json({
              isVerifiable: false,
              refinedTake: null,
              subject: null,
              prediction: null,
              timeframe: null,
              resolutionCriteria: null,
              suggestedResolutionDate: null,
              explanation: `This take conflicts with one of your existing takes: "${conflictCheck.conflictingTakeText}". ${conflictCheck.explanation || "You can't have contradicting positions on the same subject."}`,
              hasConflict: true,
            });
          }
        }
      }
    }

    console.log("Calling OpenAI API (gpt-4o-mini)...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please analyze this prediction and provide structured verification data:\n\n"${take}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    console.log("OpenAI API response received");

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    try {
      const verification = JSON.parse(content);
      return NextResponse.json(verification);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw text:", content);
      return NextResponse.json(
        { error: `Failed to parse AI response as JSON. Raw: ${content.substring(0, 100)}...` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error verifying take:", error);
    
    if (error && typeof error === "object" && "status" in error) {
      const apiError = error as { status: number; message?: string };
      if (apiError.status === 401) {
        return NextResponse.json(
          { error: "Invalid OpenAI API key. Please check OPENAI_API_KEY in environment variables." },
          { status: 500 }
        );
      }
      if (apiError.status === 429) {
        return NextResponse.json(
          { error: "Rate limited by OpenAI API. Please try again in a moment." },
          { status: 500 }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `AI verification failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
