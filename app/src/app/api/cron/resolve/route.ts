import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { Resend } from "resend";

// NBA team names for detection
const NBA_TEAMS = [
  "hawks", "celtics", "nets", "hornets", "bulls", "cavaliers", "cavs",
  "mavericks", "mavs", "nuggets", "pistons", "warriors", "rockets",
  "pacers", "clippers", "lakers", "grizzlies", "heat", "bucks",
  "timberwolves", "wolves", "pelicans", "knicks", "thunder", "magic",
  "76ers", "sixers", "suns", "trail blazers", "blazers", "kings",
  "spurs", "raptors", "jazz", "wizards"
];

// Full team name to abbreviation mapping
const TEAM_ABBREV: Record<string, string> = {
  "hawks": "atl", "celtics": "bos", "nets": "bkn", "hornets": "cha",
  "bulls": "chi", "cavaliers": "cle", "cavs": "cle", "mavericks": "dal",
  "mavs": "dal", "nuggets": "den", "pistons": "det", "warriors": "gs",
  "rockets": "hou", "pacers": "ind", "clippers": "lac", "lakers": "lal",
  "grizzlies": "mem", "heat": "mia", "bucks": "mil", "timberwolves": "min",
  "wolves": "min", "pelicans": "no", "knicks": "ny", "thunder": "okc",
  "magic": "orl", "76ers": "phi", "sixers": "phi", "suns": "phx",
  "trail blazers": "por", "blazers": "por", "kings": "sac", "spurs": "sa",
  "raptors": "tor", "jazz": "utah", "wizards": "wsh"
};

// Detect if text mentions NBA teams
function detectNBATeams(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const team of NBA_TEAMS) {
    if (lower.includes(team)) {
      const abbrev = TEAM_ABBREV[team];
      if (abbrev && !found.includes(abbrev)) {
        found.push(abbrev);
      }
    }
  }
  return found;
}

// Fetch NBA game from ESPN
async function fetchNBAScore(date: Date, teamAbbrevs: string[]): Promise<string | null> {
  try {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`;
    
    console.log(`🏀 ESPN fetch: ${url}`);
    console.log(`🔍 Looking for teams: ${teamAbbrevs.join(', ')}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`❌ ESPN returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`📊 Found ${data.events?.length || 0} games on ${dateStr}`);
    
    for (const event of data.events || []) {
      const competitors = event.competitions?.[0]?.competitors || [];
      const gameTeams = competitors.map((c: any) => (c.team?.abbreviation || '').toLowerCase());
      
      console.log(`  Game: ${event.name} - teams: ${gameTeams.join(', ')}`);
      
      // Check if any of our teams are in this game
      const match = teamAbbrevs.some(abbr => gameTeams.includes(abbr));
      if (match) {
        const home = competitors.find((c: any) => c.homeAway === 'home');
        const away = competitors.find((c: any) => c.homeAway === 'away');
        const status = event.status?.type?.detail || 'Unknown';
        
        if (!event.status?.type?.completed) {
          return `Game not finished yet. Status: ${status}`;
        }
        
        const homeScore = parseInt(home?.score || '0');
        const awayScore = parseInt(away?.score || '0');
        const winner = homeScore > awayScore ? home?.team?.displayName : away?.team?.displayName;
        
        const result = `NBA GAME RESULT:\n${away?.team?.displayName}: ${awayScore}\n${home?.team?.displayName}: ${homeScore}\nFinal Score - Winner: ${winner}`;
        console.log(`✅ Found game: ${result}`);
        return result;
      }
    }
    
    console.log(`⚠️ No matching game found for teams: ${teamAbbrevs.join(', ')}`);
    return null;
  } catch (error) {
    console.error('ESPN fetch error:', error);
    return null;
  }
}

async function resolveTake(
  openai: OpenAI,
  take: { id: string; text: string; resolvesAt: Date }
): Promise<{ status: "VERIFIED" | "WRONG" | null; reasoning: string }> {
  
  console.log(`\n📋 Take: "${take.text}"`);
  console.log(`📅 ResolvesAt: ${take.resolvesAt} (type: ${typeof take.resolvesAt})`);
  
  // Step 1: Check if this is an NBA prediction
  const teams = detectNBATeams(take.text);
  console.log(`🏀 Detected teams: ${teams.join(', ') || 'none'}`);
  
  let externalData = "";
  
  if (teams.length > 0) {
    // It's an NBA prediction - fetch from ESPN
    console.log(`🔍 Fetching ESPN data for date: ${take.resolvesAt}`);
    const espnResult = await fetchNBAScore(take.resolvesAt, teams);
    console.log(`📊 ESPN result: ${espnResult ? espnResult.substring(0, 100) + '...' : 'null'}`);
    if (espnResult) {
      externalData = espnResult;
    }
  } else {
    console.log(`⚠️ No NBA teams detected, skipping ESPN fetch`);
  }
  
  // Step 2: Ask GPT to resolve with the data we have
  const prompt = externalData 
    ? `Determine if this prediction is TRUE or FALSE based on the game result below.

PREDICTION: "${take.text}"

${externalData}

Respond with JSON: {"resolution": "TRUE" or "FALSE", "reasoning": "brief explanation"}`
    : `Determine if this prediction has come true. If you cannot verify it with certainty, respond UNDETERMINED.

PREDICTION: "${take.text}"
RESOLUTION DATE: ${take.resolvesAt.toISOString().split('T')[0]}

Respond with JSON: {"resolution": "TRUE" or "FALSE" or "UNDETERMINED", "reasoning": "brief explanation"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { status: null, reasoning: "No AI response" };
    }

    const result = JSON.parse(content);
    console.log(`🤖 GPT result: ${JSON.stringify(result)}`);
    
    if (result.resolution === "UNDETERMINED") {
      return { status: null, reasoning: result.reasoning };
    }
    
    return {
      status: result.resolution === "TRUE" ? "VERIFIED" : "WRONG",
      reasoning: result.reasoning + (externalData ? `\n\nSource: ESPN` : ""),
    };
  } catch (error) {
    console.error("GPT error:", error);
    return { status: null, reasoning: `Error: ${error}` };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;

  try {
    const now = new Date();
    const pendingTakes = await prisma.take.findMany({
      where: { status: "PENDING", resolvesAt: { lte: now } },
      select: { id: true, text: true, resolvesAt: true },
      take: 10,
    });

    console.log(`\n🔄 Processing ${pendingTakes.length} pending takes`);
    const results = [];

    for (const take of pendingTakes) {
      console.log(`\n--- Processing take ${take.id} ---`);
      const { status, reasoning } = await resolveTake(openai, take);

      if (status) {
        await prisma.take.update({
          where: { id: take.id },
          data: { status, resolvedAt: now, resolutionReasoning: reasoning },
        });

        const fullTake = await prisma.take.findUnique({
          where: { id: take.id },
          select: { clerkUserId: true, user: { select: { email: true, username: true } } },
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

        results.push({ takeId: take.id, status, reasoning: reasoning.substring(0, 150) + "..." });
      } else {
        results.push({ takeId: take.id, status: "SKIPPED", reasoning: reasoning.substring(0, 150) + "..." });
      }
    }

    return NextResponse.json({ processed: pendingTakes.length, results, timestamp: now.toISOString() });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
