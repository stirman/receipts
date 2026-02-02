import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { Resend } from "resend";

// Classification prompt - determine what type of data source is needed
const CLASSIFICATION_PROMPT = `You are a classifier that determines what data source is needed to verify a prediction.

Analyze the prediction and respond with JSON:
{
  "category": "NBA" | "NFL" | "MLB" | "NHL" | "SOCCER" | "WEATHER" | "STOCK" | "CRYPTO" | "OTHER",
  "teams": ["Team1", "Team2"] // For sports, the two teams involved (use official team names like "Los Angeles Clippers", "Denver Nuggets")
  "date": "YYYY-MM-DD" // The date the event occurred or should occur
  "details": "Brief description of what to look up"
}

For sports predictions, extract:
- The two teams playing
- The date of the game

Examples:
- "The Clippers will beat the Nuggets tonight" -> NBA, teams: ["Los Angeles Clippers", "Denver Nuggets"], date: today
- "Rockets will beat Mavericks on January 31" -> NBA, teams: ["Houston Rockets", "Dallas Mavericks"], date: "2026-01-31"
- "It will rain in SF tomorrow" -> WEATHER
- "Bitcoin will hit 100k" -> CRYPTO`;

const RESOLUTION_PROMPT = `You are an AI that determines whether predictions have come true.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

You will be given a prediction along with VERIFIED DATA from an official source. Your job is to:
1. Analyze the provided data
2. Determine if the prediction is TRUE, FALSE, or UNDETERMINED
3. Provide clear reasoning

IMPORTANT RULES:
- Only mark as TRUE if the data clearly shows the prediction came true
- Only mark as FALSE if the data clearly shows it did NOT come true  
- Mark as UNDETERMINED if the data doesn't contain the needed information
- Be objective and cite the specific data provided

Respond with JSON:
{
  "resolution": "TRUE" | "FALSE" | "UNDETERMINED",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Explanation citing the specific data",
  "sources": "The data source used"
}`;

// Team name mapping for ESPN API
const NBA_TEAMS: Record<string, string> = {
  "atlanta hawks": "atl", "hawks": "atl",
  "boston celtics": "bos", "celtics": "bos",
  "brooklyn nets": "bkn", "nets": "bkn",
  "charlotte hornets": "cha", "hornets": "cha",
  "chicago bulls": "chi", "bulls": "chi",
  "cleveland cavaliers": "cle", "cavaliers": "cle", "cavs": "cle",
  "dallas mavericks": "dal", "mavericks": "dal", "mavs": "dal",
  "denver nuggets": "den", "nuggets": "den",
  "detroit pistons": "det", "pistons": "det",
  "golden state warriors": "gs", "warriors": "gs",
  "houston rockets": "hou", "rockets": "hou",
  "indiana pacers": "ind", "pacers": "ind",
  "los angeles clippers": "lac", "la clippers": "lac", "clippers": "lac",
  "los angeles lakers": "lal", "la lakers": "lal", "lakers": "lal",
  "memphis grizzlies": "mem", "grizzlies": "mem",
  "miami heat": "mia", "heat": "mia",
  "milwaukee bucks": "mil", "bucks": "mil",
  "minnesota timberwolves": "min", "timberwolves": "min", "wolves": "min",
  "new orleans pelicans": "no", "pelicans": "no",
  "new york knicks": "ny", "knicks": "ny",
  "oklahoma city thunder": "okc", "thunder": "okc",
  "orlando magic": "orl", "magic": "orl",
  "philadelphia 76ers": "phi", "76ers": "phi", "sixers": "phi",
  "phoenix suns": "phx", "suns": "phx",
  "portland trail blazers": "por", "trail blazers": "por", "blazers": "por",
  "sacramento kings": "sac", "kings": "sac",
  "san antonio spurs": "sa", "spurs": "sa",
  "toronto raptors": "tor", "raptors": "tor",
  "utah jazz": "utah", "jazz": "utah",
  "washington wizards": "wsh", "wizards": "wsh",
};

// Fetch NBA game results from ESPN
async function fetchNBAGame(teams: string[], dateStr: string): Promise<string> {
  try {
    // Format date for ESPN API (YYYYMMDD)
    const espnDate = dateStr.replace(/-/g, '');
    const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate}`;
    
    console.log(`🏀 Fetching NBA scores from ESPN: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      return `ESPN API error: ${response.status}`;
    }
    
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return `No NBA games found for ${dateStr}`;
    }
    
    // Find the matching game
    const teamAbbrs = teams.map(t => NBA_TEAMS[t.toLowerCase()]).filter(Boolean);
    console.log(`🔍 Looking for teams: ${teams.join(', ')} -> abbrs: ${teamAbbrs.join(', ')}`);
    
    for (const event of data.events) {
      const competitors = event.competitions?.[0]?.competitors || [];
      const eventTeams = competitors.map((c: any) => c.team?.abbreviation?.toLowerCase());
      
      // Check if both teams are in this game
      const matchCount = teamAbbrs.filter(abbr => eventTeams.includes(abbr)).length;
      if (matchCount >= 1) { // At least one team matches (be lenient)
        const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competitors.find((c: any) => c.homeAway === 'away');
        
        const gameStatus = event.status?.type?.completed ? 'Final' : event.status?.type?.detail || 'In Progress';
        
        if (!event.status?.type?.completed) {
          return `Game not yet completed. Status: ${gameStatus}`;
        }
        
        const result = `NBA GAME RESULT (${dateStr}):
${awayTeam?.team?.displayName}: ${awayTeam?.score}
${homeTeam?.team?.displayName}: ${homeTeam?.score}
Status: ${gameStatus}
Winner: ${parseInt(homeTeam?.score) > parseInt(awayTeam?.score) ? homeTeam?.team?.displayName : awayTeam?.team?.displayName}`;
        
        console.log(`✅ Found game: ${result}`);
        return result;
      }
    }
    
    // If no match found, list all games for that date
    const allGames = data.events.map((e: any) => {
      const comps = e.competitions?.[0]?.competitors || [];
      return comps.map((c: any) => c.team?.displayName).join(' vs ');
    }).join(', ');
    
    return `Could not find game with teams ${teams.join(' vs ')}. Games on ${dateStr}: ${allGames}`;
  } catch (error) {
    console.error("ESPN API error:", error);
    return `Failed to fetch ESPN data: ${error}`;
  }
}

// Search the web using Exa API (fallback for non-sports)
async function searchWeb(query: string): Promise<string> {
  const exaApiKey = process.env.EXA_API_KEY;
  if (!exaApiKey) {
    return "No web search available.";
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaApiKey,
      },
      body: JSON.stringify({
        query: query,
        numResults: 5,
        contents: { text: { maxCharacters: 1000 } },
        type: "neural",
        useAutoprompt: true,
      }),
    });

    if (!response.ok) {
      return "Web search failed.";
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return "No search results found.";
    }

    let formattedResults = "WEB SEARCH RESULTS:\n\n";
    for (const result of data.results) {
      formattedResults += `SOURCE: ${result.title}\n`;
      formattedResults += `URL: ${result.url}\n`;
      if (result.text) {
        formattedResults += `CONTENT: ${result.text}\n`;
      }
      formattedResults += "\n---\n\n";
    }

    return formattedResults;
  } catch (error) {
    return `Web search error: ${error}`;
  }
}

// Classify the take and get appropriate data
async function classifyAndFetchData(
  openai: OpenAI,
  take: {
    text: string;
    aiSubject: string | null;
    aiPrediction: string | null;
    aiResolutionCriteria: string | null;
  }
): Promise<string> {
  try {
    // Step 1: Classify the take
    const classifyResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use mini for classification (faster/cheaper)
      max_tokens: 256,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: `Classify this prediction:\n\n"${take.text}"\n\nResolution criteria: ${take.aiResolutionCriteria || 'Not specified'}\nToday's date: ${new Date().toISOString().split('T')[0]}` },
      ],
      response_format: { type: "json_object" },
    });

    const classifyContent = classifyResponse.choices[0]?.message?.content;
    if (!classifyContent) {
      return "Classification failed.";
    }

    const classification = JSON.parse(classifyContent);
    console.log(`📋 Classification: ${JSON.stringify(classification)}`);

    // Step 2: Fetch data based on category
    switch (classification.category) {
      case "NBA":
        if (classification.teams?.length >= 2 && classification.date) {
          return await fetchNBAGame(classification.teams, classification.date);
        }
        // Fall through to web search if missing data
        break;
      
      case "NFL":
      case "MLB":
      case "NHL":
        // Could add ESPN endpoints for these sports too
        // For now, fall through to web search
        break;
    }

    // Fallback to Exa web search
    const searchQuery = classification.details || take.aiResolutionCriteria || take.text;
    return await searchWeb(searchQuery);
    
  } catch (error) {
    console.error("Classification error:", error);
    return `Classification error: ${error}`;
  }
}

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
    // Get data from appropriate source
    console.log(`🔄 Processing take: ${take.id}`);
    const data = await classifyAndFetchData(openai, take);
    console.log(`📊 Data retrieved: ${data.substring(0, 200)}...`);

    // Now ask GPT to resolve based on the data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: RESOLUTION_PROMPT },
        {
          role: "user",
          content: `Determine if this prediction came true based on the data below:

PREDICTION: "${take.text}"
SUBJECT: ${take.aiSubject || "Not specified"}
WHAT WAS PREDICTED: ${take.aiPrediction || "Not specified"}
RESOLUTION CRITERIA: ${take.aiResolutionCriteria || "Not specified"}

VERIFIED DATA:
${data}

Based on this data, has the prediction come true?`,
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
        reasoning: `Unable to determine: ${result.reasoning}` 
      };
    }

    return {
      status: result.resolution === "TRUE" ? "VERIFIED" : "WRONG",
      reasoning: `${result.reasoning}\n\nSource: ${result.sources}`,
    };
  } catch (error) {
    console.error("Error resolving take:", take.id, error);
    return { status: null, reasoning: `Resolution error: ${error}` };
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
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  try {
    const now = new Date();
    const pendingTakes = await prisma.take.findMany({
      where: {
        status: "PENDING",
        resolvesAt: { lte: now },
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
          select: { 
            clerkUserId: true,
            user: { select: { email: true, username: true } }
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

          if (resend && fullTake.user?.email) {
            await sendResolutionEmail(resend, { id: take.id, text: take.text, status, reasoning }, fullTake.user.email, fullTake.user.username);
          }
        }

        results.push({ takeId: take.id, status, reasoning: reasoning.substring(0, 200) + "..." });
      } else {
        results.push({ takeId: take.id, status: "SKIPPED", reasoning: reasoning.substring(0, 200) + "..." });
      }
    }

    return NextResponse.json({ processed: pendingTakes.length, results, timestamp: now.toISOString() });
  } catch (error) {
    console.error("Cron resolution error:", error);
    return NextResponse.json({ error: `Resolution failed: ${error}` }, { status: 500 });
  }
}

async function sendResolutionEmail(
  resend: Resend,
  take: { id: string; text: string; status: "VERIFIED" | "WRONG"; reasoning: string },
  userEmail: string,
  username: string
): Promise<void> {
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
          <p style="background: #f5f5f0; padding: 15px; border-radius: 8px; font-style: italic;">"${take.text}"</p>
          <div style="text-align: center; padding: 20px;">
            <span style="font-size: 48px;">${statusEmoji}</span>
            <h3 style="color: ${take.status === "VERIFIED" ? "#22c55e" : "#ef4444"}; margin: 10px 0;">${statusText}</h3>
            <p>${resultText}</p>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <strong>Resolution Reasoning:</strong>
            <p style="font-size: 14px; color: #666;">${take.reasoning.substring(0, 500)}${take.reasoning.length > 500 ? "..." : ""}</p>
          </div>
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://receipts.vercel.app/take/${take.id}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Receipt</a>
          </p>
        </div>
      `,
    });
    console.log(`✅ Email sent to ${userEmail}`);
  } catch (error) {
    console.error(`Failed to send email:`, error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
