"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

interface UsageStats {
  takes: {
    total: number;
    pending: number;
    verified: number;
    wrong: number;
  };
  users: number;
  agreements: number;
  apiCalls: {
    verify: number;
    suggest: number;
    resolve: number;
    appeal: number;
  };
}

// Cost estimates per 1K tokens (approximate)
const COSTS = {
  "gpt-4o-mini-input": 0.00015,
  "gpt-4o-mini-output": 0.0006,
  "gpt-4o-input": 0.0025,
  "gpt-4o-output": 0.01,
};

// Estimated tokens per API call (rough estimates)
const TOKENS_PER_CALL = {
  verify: { input: 800, output: 400 },      // gpt-4o-mini
  suggest: { input: 500, output: 300 },     // gpt-4o-mini
  resolve: { input: 1500, output: 500 },    // gpt-4o
  appeal: { input: 1200, output: 600 },     // gpt-4o
  conflict: { input: 600, output: 200 },    // gpt-4o-mini
};

const SERVICES = [
  {
    name: "Vercel",
    purpose: "Hosting & serverless functions",
    cost: "Free tier (Hobby) - Pro is $20/mo",
    dashboard: "https://vercel.com/dashboard",
    notes: "Cron jobs limited to daily on Hobby"
  },
  {
    name: "OpenAI",
    purpose: "AI verification, suggestions, resolution",
    cost: "Pay per token (~$0.15/1K input, $0.60/1K output for mini)",
    dashboard: "https://platform.openai.com/usage",
    notes: "Using gpt-4o-mini (cheap) for most, gpt-4o for resolution"
  },
  {
    name: "Clerk",
    purpose: "User authentication",
    cost: "Free up to 10K MAU, then $0.02/MAU",
    dashboard: "https://dashboard.clerk.com",
    notes: "Handles sign in, sign up, user management"
  },
  {
    name: "Vercel Postgres",
    purpose: "Database (via Prisma)",
    cost: "Free tier: 256MB storage, then $0.10/GB",
    dashboard: "https://vercel.com/dashboard/stores",
    notes: "Stores takes, users, agreements"
  },
  {
    name: "ESPN API",
    purpose: "Sports scores for resolution",
    cost: "FREE - no API key needed",
    dashboard: "N/A",
    notes: "Public API, no rate limits observed"
  },
  {
    name: "X/Twitter",
    purpose: "Share to X functionality",
    cost: "FREE - uses Intent URLs (user posts themselves)",
    dashboard: "N/A",
    notes: "No API calls, just opens popup for user"
  },
];

const ADMIN_USERNAMES = ["stirman"];

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.username && ADMIN_USERNAMES.includes(user.username.toLowerCase());

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  useEffect(() => {
    if (isSignedIn && isAdmin) {
      fetchStats();
    }
  }, [isSignedIn, isAdmin]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn || !isAdmin) {
    return null;
  }

  // Calculate estimated costs
  const estimateCosts = () => {
    if (!stats) return { total: 0, breakdown: {} };

    const verifyInputCost = (stats.apiCalls.verify * TOKENS_PER_CALL.verify.input / 1000) * COSTS["gpt-4o-mini-input"];
    const verifyOutputCost = (stats.apiCalls.verify * TOKENS_PER_CALL.verify.output / 1000) * COSTS["gpt-4o-mini-output"];
    
    const suggestInputCost = (stats.apiCalls.suggest * TOKENS_PER_CALL.suggest.input / 1000) * COSTS["gpt-4o-mini-input"];
    const suggestOutputCost = (stats.apiCalls.suggest * TOKENS_PER_CALL.suggest.output / 1000) * COSTS["gpt-4o-mini-output"];
    
    const resolveInputCost = (stats.apiCalls.resolve * TOKENS_PER_CALL.resolve.input / 1000) * COSTS["gpt-4o-input"];
    const resolveOutputCost = (stats.apiCalls.resolve * TOKENS_PER_CALL.resolve.output / 1000) * COSTS["gpt-4o-output"];
    
    const appealInputCost = (stats.apiCalls.appeal * TOKENS_PER_CALL.appeal.input / 1000) * COSTS["gpt-4o-input"];
    const appealOutputCost = (stats.apiCalls.appeal * TOKENS_PER_CALL.appeal.output / 1000) * COSTS["gpt-4o-output"];

    return {
      verify: verifyInputCost + verifyOutputCost,
      suggest: suggestInputCost + suggestOutputCost,
      resolve: resolveInputCost + resolveOutputCost,
      appeal: appealInputCost + appealOutputCost,
      total: verifyInputCost + verifyOutputCost + suggestInputCost + suggestOutputCost + 
             resolveInputCost + resolveOutputCost + appealInputCost + appealOutputCost,
    };
  };

  const costs = estimateCosts();

  return (
    <div className="min-h-screen text-white relative">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-white/50 mb-8">Usage stats and cost estimates</p>

        {isLoading ? (
          <div className="text-white/50">Loading...</div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Usage Stats */}
            <section>
              <h2 className="text-xl font-semibold mb-4">📊 Usage Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold">{stats.takes.total}</div>
                  <div className="text-white/50 text-sm">Total Takes</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold">{stats.users}</div>
                  <div className="text-white/50 text-sm">Users</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold">{stats.agreements}</div>
                  <div className="text-white/50 text-sm">Positions Taken</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-400">{stats.takes.pending}</div>
                  <div className="text-white/50 text-sm">Pending</div>
                </div>
              </div>
            </section>

            {/* API Calls & Costs */}
            <section>
              <h2 className="text-xl font-semibold mb-4">💰 Estimated API Costs</h2>
              <div className="bg-white/5 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-400 mb-4">
                  ~${costs.total.toFixed(2)}
                </div>
                <div className="text-white/50 text-sm mb-4">Estimated total OpenAI spend</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Verify ({stats.apiCalls.verify} calls, gpt-4o-mini)</span>
                    <span>${costs.verify?.toFixed(3) || "0.000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suggest ({stats.apiCalls.suggest} calls, gpt-4o-mini)</span>
                    <span>${costs.suggest?.toFixed(3) || "0.000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolve ({stats.apiCalls.resolve} calls, gpt-4o)</span>
                    <span>${costs.resolve?.toFixed(3) || "0.000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Appeal ({stats.apiCalls.appeal} calls, gpt-4o)</span>
                    <span>${costs.appeal?.toFixed(3) || "0.000"}</span>
                  </div>
                </div>
                
                <p className="text-white/30 text-xs mt-4">
                  * Estimates based on avg token counts. Check OpenAI dashboard for actual usage.
                </p>
              </div>
            </section>

            {/* Services */}
            <section>
              <h2 className="text-xl font-semibold mb-4">🔧 Services & APIs</h2>
              <div className="space-y-3">
                {SERVICES.map((service) => (
                  <div key={service.name} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{service.name}</div>
                      {service.dashboard !== "N/A" && (
                        <a 
                          href={service.dashboard} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Dashboard →
                        </a>
                      )}
                    </div>
                    <div className="text-white/70 text-sm">{service.purpose}</div>
                    <div className="text-white/50 text-xs mt-1">{service.cost}</div>
                    <div className="text-white/30 text-xs mt-1">{service.notes}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-xl font-semibold mb-4">⚡ Quick Links</h2>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="https://vercel.com/stirmans-projects/receipts" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                >
                  Vercel Project
                </a>
                <a 
                  href="https://platform.openai.com/usage" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                >
                  OpenAI Usage
                </a>
                <a 
                  href="https://dashboard.clerk.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                >
                  Clerk Dashboard
                </a>
                <a 
                  href="https://github.com/stirman/receipts" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                >
                  GitHub Repo
                </a>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-red-400">Failed to load stats</div>
        )}
      </main>

      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-sm">
          <p>Created by <a href="https://x.com/stirman" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">@stirman</a>. Copyright 2026.</p>
        </div>
      </footer>
    </div>
  );
}
