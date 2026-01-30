import { NextRequest, NextResponse } from "next/server";
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
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log("Calling OpenAI API (gpt-4o-mini)...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Please analyze this prediction and provide structured verification data:\n\n"${take}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    console.log("OpenAI API response received");

    // Extract the text content from the response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
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
    
    // Handle OpenAI API errors specifically
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
