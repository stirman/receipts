import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You help users turn vague predictions into clear, verifiable claims.

Given an unclear or vague prediction, suggest a more specific version that:
1. Has a clear, measurable outcome
2. Specifies a timeframe
3. Can be definitively proven true or false

Respond with JSON:
{
  "suggestedTake": "The clearer, more specific version of the prediction",
  "explanation": "Brief explanation of what you clarified and why"
}

Examples:
- "The Rockets will be good" → "The Houston Rockets will make the 2025-26 NBA playoffs"
- "AI is going to change everything" → "ChatGPT will have over 500 million monthly users by end of 2026"
- "This movie will be huge" → "Avengers: Secret Wars will gross over $2 billion worldwide"

Keep the spirit of the original take while making it verifiable.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not found" },
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

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please suggest a clearer, more verifiable version of this prediction:\n\n"${take}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error suggesting take:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
