import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

// Temporary test endpoint for resolution
// TODO: Move this logic to /api/cron/resolve once deployment issue is fixed

// ESPN API for sports scores (no API key needed!)
interface ESPNGame {
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  status: string;
  name: string;
}

async function getESPNScores(sport: string, league: string, date: string): Promise<ESPNGame[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${date}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("ESPN API failed:", response.status);
      return [];
    }

    const data = await response.json();
    const events = data.events || [];
    
    return events.map((event: { name: string; status: { type: { name: string } }; competitions: Array<{ competitors: Array<{ team: { abbreviation: string; displayName: string }; score: string }> }> }) => {
      const competition = event.competitions[0];
      const home = competition.competitors.find((c: { homeAway?: string }) => c.homeAway === "home") || competition.competitors[0];
      const away = competition.competitors.find((c: { homeAway?: string }) => c.homeAway === "away") || competition.competitors[1];
      
      return {
        name: event.name,
        status: event.status.type.name,
        homeTeam: home.team.displayName,
        homeScore: parseInt(home.score) || 0,
        awayTeam: away.team.displayName,
        awayScore: parseInt(away.score) || 0,
      };
    });
  } catch (error) {
    console.error("ESPN API error:", error);
    return [];
  }
}

// Detect if prediction is about sports and get relevant data
async function getSportsContext(subject: string, prediction: string, resolutionDate: Date | null): Promise<string> {
  const textLower = `${subject} ${prediction}`.toLowerCase();
  
  // NBA team names and abbreviations
  const nbaTeams = [
    "lakers", "warriors", "celtics", "nets", "knicks", "bulls", "heat", "suns", 
    "mavericks", "bucks", "76ers", "sixers", "clippers", "nuggets", "grizzlies",
    "pelicans", "rockets", "spurs", "thunder", "jazz", "kings", "blazers",
    "raptors", "hawks", "hornets", "pistons", "pacers", "cavaliers", "cavs",
    "magic", "wizards", "timberwolves", "wolves"
  ];
  
  const isNBA = nbaTeams.some(team => textLower.includes(team)) || 
                textLower.includes("nba") || textLower.includes("basketball");
  
  if (isNBA && resolutionDate) {
    // Format date as YYYYMMDD
    const dateStr = resolutionDate.toISOString().split("T")[0].replace(/-/g, "");
    const games = await getESPNScores("basketball", "nba", dateStr);
    
    if (games.length > 0) {
      const gamesText = games.map(g => 
        `${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore} (${g.status})`
      ).join("\n");
      
      return `NBA GAMES FOR ${resolutionDate.toDateString()}:\n${gamesText}`;
    }
  }
  
  // TODO: Add NFL, MLB, NHL support
  
  return "";
}

// Search for relevant information using Exa API (fallback for non-sports)
async function searchForContext(query: string): Promise<string> {
  const exaApiKey = process.env.EXA_API_KEY;
  if (!exaApiKey) {
    console.log("No EXA_API_KEY, skipping web search");
    return "";
  }

  try {
    // Search with recency focus for recent events
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaApiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 10,
        useAutoprompt: true,
        type: "auto",
        contents: {
          text: { maxCharacters: 1500 },
        },
        // Focus on recent content
        startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }),
    });

    if (!response.ok) {
      console.error("Exa search failed:", response.status);
      return "";
    }

    const data = await response.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      return "No search results found.";
    }

    // Format search results as context
    const context = results
      .map((r: { title?: string; url?: string; text?: string }, i: number) => 
        `[${i + 1}] ${r.title || "No title"}\nURL: ${r.url}\n${r.text || "No content"}`
      )
      .join("\n\n");

    return `WEB SEARCH RESULTS:\n${context}`;
  } catch (error) {
    console.error("Exa search error:", error);
    return "";
  }
}

const RESOLUTION_PROMPT = `You are an AI that determines whether predictions have come true.

TODAY'S DATE AND TIME: ${new Date().toISOString()}

You will be given a prediction with its resolution criteria, along with WEB SEARCH RESULTS containing current information.

Your job is to:
1. Analyze the web search results for relevant information
2. Determine if the prediction is TRUE, FALSE, or UNDETERMINED
3. Provide clear reasoning with sources/facts from the search results

IMPORTANT RULES:
- Only mark as TRUE if there is clear evidence the prediction came true
- Only mark as FALSE if there is clear evidence it did NOT come true  
- Mark as UNDETERMINED if the search results don't contain sufficient information
- Be objective and cite specific facts, scores, prices, announcements from the search results
- If the event hasn't happened yet (even if past resolution date), mark UNDETERMINED

Respond with JSON:
{
  "resolution": "TRUE" | "FALSE" | "UNDETERMINED",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Detailed explanation with specific facts, dates, scores, etc. from the search results",
  "sources": "URLs or sources from the search results you used"
}`;

async function resolveTake(
  openai: OpenAI,
  take: {
    id: string;
    text: string;
    aiSubject: string | null;
    aiPrediction: string | null;
    aiResolutionCriteria: string | null;
    resolvesAt: Date | null;
  }
): Promise<{ status: "VERIFIED" | "WRONG" | null; reasoning: string }> {
  try {
    const subject = take.aiSubject || "";
    const prediction = take.aiPrediction || take.text;
    
    // First try sports-specific APIs
    const sportsContext = await getSportsContext(subject, prediction, take.resolvesAt);
    console.log(`Sports context: ${sportsContext.length} chars`);
    
    // Fall back to Exa search if no sports context
    let searchContext = sportsContext;
    if (!searchContext) {
      const searchQuery = `${subject} ${prediction} final result score January 2026`.slice(0, 200);
      console.log(`Searching for: ${searchQuery}`);
      searchContext = await searchForContext(searchQuery);
      console.log(`Exa search returned ${searchContext.length} chars`);
    }

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

${searchContext}

Based on the search results above, has this prediction come true?`,
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
        resolvesAt: true,
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
