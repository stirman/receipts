import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TODAY = new Date().toISOString().split("T")[0];

const SYSTEM_PROMPT = `You help users turn vague predictions into clear, verifiable claims.

⚠️ CRITICAL: TODAY'S DATE IS ${TODAY}

A valid prediction MUST:
1. Predict a FUTURE event (after ${TODAY})
2. Have an objectively true or false outcome (not subjective opinions)
3. Be verifiable using PUBLIC DATA (official stats, prices, news, records)
4. Be something an AI can definitively verify from public information

DO NOT suggest:
- Subjective claims ("best", "GOAT", "greatest", "amazing")
- Past dates (anything before ${TODAY})
- Opinion polls or surveys
- Claims requiring private information
- Anything that can't be definitively proven true or false

Given an unclear or vague prediction, suggest a more specific version that meets these criteria.

Respond with JSON:
{
  "suggestedTake": "The clearer, verifiable prediction with a FUTURE date",
  "explanation": "Brief explanation of what you changed and why"
}

Examples:
- "LeBron is the GOAT" → "LeBron James will win the 2026 NBA MVP award" (turns subjective into objective future event)
- "The Rockets will be good" → "The Houston Rockets will make the 2026 NBA playoffs"
- "AI is taking over" → "ChatGPT will have over 500 million monthly users by December 2026"
- "This stock will moon" → "Tesla stock will reach $500 per share by end of 2026"

Keep the spirit of the original take while making it verifiable with future public data.`;

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
          content: `Today is ${TODAY}. Please suggest a clearer, objectively verifiable prediction (with a FUTURE date and PUBLIC data for verification) based on this:\n\n"${take}"`,
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
