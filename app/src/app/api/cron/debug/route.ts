import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Debug endpoint to test ESPN API and see what data we're getting
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get pending takes
    const pendingTakes = await prisma.take.findMany({
      where: {
        status: "PENDING",
        resolvesAt: { lte: new Date() },
      },
      select: {
        id: true,
        text: true,
        resolvesAt: true,
        aiResolutionCriteria: true,
      },
      take: 5,
    });

    const results = [];

    for (const take of pendingTakes) {
      // Format date for ESPN
      const resolvesAt = new Date(take.resolvesAt);
      const espnDate = resolvesAt.toISOString().split('T')[0].replace(/-/g, '');
      
      // Test ESPN API directly
      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate}`;
      
      let espnResult = null;
      try {
        const espnResponse = await fetch(espnUrl);
        const espnData = await espnResponse.json();
        espnResult = {
          url: espnUrl,
          status: espnResponse.status,
          gameCount: espnData.events?.length || 0,
          games: espnData.events?.map((e: any) => ({
            name: e.name,
            status: e.status?.type?.detail,
            score: e.competitions?.[0]?.competitors?.map((c: any) => 
              `${c.team?.displayName}: ${c.score}`
            ).join(' vs '),
          })) || [],
        };
      } catch (error) {
        espnResult = { error: String(error) };
      }

      results.push({
        takeId: take.id,
        text: take.text.substring(0, 100),
        resolvesAt: take.resolvesAt,
        espnDate,
        espn: espnResult,
      });
    }

    return NextResponse.json({ results, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
