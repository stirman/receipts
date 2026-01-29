import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
  try {
    const body = await request.json();
    const { take } = body;

    if (!take || typeof take !== "string") {
      return NextResponse.json(
        { error: "Take text is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI verification is not configured. Please add ANTHROPIC_API_KEY to environment variables." },
        { status: 500 }
      );
    }

    // Initialize Anthropic client with API key
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Please analyze this prediction and provide structured verification data:\n\n"${take}"`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract the text content from the response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON response - handle potential markdown code blocks
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const verification = JSON.parse(jsonText);

    return NextResponse.json(verification);
  } catch (error) {
    console.error("Error verifying take:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to verify take: ${errorMessage}` },
      { status: 500 }
    );
  }
}
