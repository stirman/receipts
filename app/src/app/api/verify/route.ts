import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an AI assistant that helps verify and structure predictions ("hot takes") for the Receipts app. Your job is to:

1. Analyze if a prediction is verifiable (has a clear outcome, timeframe, and measurable result)
2. If vague, suggest a more specific version
3. Extract structured data from the prediction
4. Suggest a realistic resolution date

You must respond ONLY with valid JSON in this exact format:
{
  "isVerifiable": boolean,
  "refinedTake": "The refined/clarified version of the take (or null if already clear)",
  "subject": "The main subject of the prediction (e.g., 'Houston Rockets', 'Bitcoin', 'Taylor Swift')",
  "prediction": "What is being predicted (e.g., 'will make the playoffs', 'will reach $100k', 'will win Album of the Year')",
  "timeframe": "The time period (e.g., '2025-26 NBA season', 'by end of 2026', '2026 Grammy Awards')",
  "resolutionCriteria": "How we'll know if the prediction is true (e.g., 'Team finishes in top 10 of their conference')",
  "suggestedResolutionDate": "YYYY-MM-DD format - when this prediction can be resolved",
  "explanation": "Brief explanation of your interpretation (shown to user)"
}

Guidelines:
- Today's date is ${new Date().toISOString().split("T")[0]}
- For sports predictions without a specified season, assume the current or upcoming season
- For NBA: Regular season ends mid-April, playoffs run through June
- For NFL: Regular season ends January, Super Bowl is mid-February
- For ambiguous timeframes, pick a reasonable resolution date and explain
- If the prediction is too vague to verify (e.g., "this will be good"), set isVerifiable to false
- refinedTake should be the polished version users will see on their receipt
- Keep explanations concise and friendly`;

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
