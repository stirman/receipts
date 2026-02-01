import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { Resend } from "resend";

// This endpoint should be called by a cron job every 15 minutes
// Vercel Cron: Add to vercel.json or use Vercel dashboard

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
      model: "gpt-4o", // Use gpt-4o for better reasoning on resolution
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
    
    // Only resolve if we have HIGH or MEDIUM confidence
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
  // Verify cron secret (for security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if no CRON_SECRET set (development) or if it matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });
  
  // Initialize Resend for email notifications (optional)
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  if (!resend) {
    console.log("RESEND_API_KEY not configured - email notifications disabled");
  }

  try {
    // Find takes that are due for resolution
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
      take: 10, // Process in batches to avoid timeouts
    });

    console.log(`Found ${pendingTakes.length} takes to resolve`);

    const results = [];

    for (const take of pendingTakes) {
      console.log(`Resolving take: ${take.id}`);
      const { status, reasoning } = await resolveTake(openai, take);

      if (status) {
        // Update the take
        await prisma.take.update({
          where: { id: take.id },
          data: {
            status,
            resolvedAt: now,
            resolutionReasoning: reasoning,
          },
        });

        // Update user win/loss record and get user info for email
        const fullTake = await prisma.take.findUnique({
          where: { id: take.id },
          select: { 
            clerkUserId: true,
            user: {
              select: {
                email: true,
                username: true,
              }
            }
          },
        });

        if (fullTake?.clerkUserId) {
          await prisma.user.update({
            where: { clerkId: fullTake.clerkUserId },
            data: {
              wins: status === "VERIFIED" ? { increment: 1 } : undefined,
              losses: status === "WRONG" ? { increment: 1 } : undefined,
            },
          });

          // Send email notification
          if (fullTake.user?.email) {
            await sendResolutionEmail(
              resend,
              { id: take.id, text: take.text, status, reasoning },
              fullTake.user.email,
              fullTake.user.username
            );
          }
        }

        // TODO: Update agreement records (wins/losses for people who agreed/disagreed)

        results.push({
          takeId: take.id,
          status,
          reasoning: reasoning.substring(0, 200) + "...",
          emailSent: !!fullTake?.user?.email,
        });
      } else {
        results.push({
          takeId: take.id,
          status: "SKIPPED",
          reasoning: reasoning.substring(0, 200) + "...",
        });
      }
    }

    return NextResponse.json({
      processed: pendingTakes.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron resolution error:", error);
    return NextResponse.json(
      { error: `Resolution failed: ${error}` },
      { status: 500 }
    );
  }
}

// Send email notification about take resolution
async function sendResolutionEmail(
  resend: Resend | null,
  take: {
    id: string;
    text: string;
    status: "VERIFIED" | "WRONG";
    reasoning: string;
  },
  userEmail: string | null,
  username: string
): Promise<void> {
  if (!resend || !userEmail) {
    console.log(`Skipping email for ${username}: no email or Resend not configured`);
    return;
  }

  const statusEmoji = take.status === "VERIFIED" ? "✅" : "❌";
  const statusText = take.status === "VERIFIED" ? "VERIFIED" : "WRONG";
  const resultText = take.status === "VERIFIED" 
    ? "Congrats! Your prediction was correct!" 
    : "Better luck next time - your prediction didn't pan out.";

  try {
    await resend.emails.send({
      from: "Receipts <notifications@receipts.app>",
      to: userEmail,
      subject: `${statusEmoji} Your take was ${statusText.toLowerCase()}!`,
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="border-bottom: 2px dashed #ccc; padding-bottom: 10px;">📜 RECEIPT</h2>
          
          <p style="background: #f5f5f0; padding: 15px; border-radius: 8px; font-style: italic;">
            "${take.text}"
          </p>
          
          <div style="text-align: center; padding: 20px;">
            <span style="font-size: 48px;">${statusEmoji}</span>
            <h3 style="color: ${take.status === "VERIFIED" ? "#22c55e" : "#ef4444"}; margin: 10px 0;">
              ${statusText}
            </h3>
            <p>${resultText}</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <strong>Resolution Reasoning:</strong>
            <p style="font-size: 14px; color: #666;">${take.reasoning.substring(0, 500)}${take.reasoning.length > 500 ? "..." : ""}</p>
          </div>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://receipts.vercel.app/take/${take.id}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Receipt
            </a>
          </p>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px; border-top: 1px dashed #ddd; padding-top: 15px;">
            Receipts - Lock in your takes. Get your receipts.
          </p>
        </div>
      `,
    });
    console.log(`✅ Email sent to ${userEmail} for take ${take.id}`);
  } catch (error) {
    console.error(`Failed to send email to ${userEmail}:`, error);
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
