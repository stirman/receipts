"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { ReceiptCard } from "@/components/ReceiptCard";
import { Header } from "@/components/Header";
import type { Take } from "@/lib/types";

// Dynamically import TakeForm to avoid Clerk SSR issues
const TakeForm = dynamic(
  () => import("@/components/TakeForm").then((mod) => mod.TakeForm),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 animate-pulse">
          <div className="h-32 bg-white/5 rounded-lg"></div>
        </div>
      </div>
    )
  }
);

type TakeWithPosition = Take & { 
  userPosition?: "AGREE" | "DISAGREE" | null;
  agreeCount?: number;
  disagreeCount?: number;
};

type TabType = "trending" | "recent" | "mine";

export default function Home() {
  const { isSignedIn } = useAuth();
  const [takes, setTakes] = useState<TakeWithPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [myTakesStats, setMyTakesStats] = useState<{ accuracy: number | null; pending: number } | null>(null);

  const fetchTakes = async (tab: TabType) => {
    setIsLoading(true);
    try {
      let endpoint = "/api/takes/trending";
      if (tab === "recent") endpoint = "/api/takes/recent";
      if (tab === "mine") endpoint = "/api/takes/mine";

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        if (tab === "mine") {
          setTakes(data.takes || []);
          setMyTakesStats(data.stats);
        } else {
          setTakes(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch takes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTakes(activeTab);
  }, [activeTab]);

  const handleNewTake = (newTake: Take) => {
    setTakes([{ ...newTake, userPosition: null, agreeCount: 0, disagreeCount: 0 }, ...takes]);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === "mine" && !isSignedIn) return;
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen text-white relative">
      <Header />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Lock in your takes.
          <br />
          <span className="text-white/60">Get your receipts.</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-12">
          The &ldquo;I told you so&rdquo; moment, formalized. Make predictions,
          lock them in with a timestamp, and prove you were right all along.
        </p>

        {/* Take Form */}
        <div id="create" className="flex justify-center mb-16 scroll-mt-24">
          <TakeForm onSuccess={handleNewTake} />
        </div>
      </section>

      {/* Takes Section */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={() => handleTabChange("trending")}
            className={`text-lg font-semibold transition-colors flex items-center gap-1 ${
              activeTab === "trending" 
                ? "text-white" 
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {isLoading && activeTab === "trending" ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>🔥</span>
            )} Trending
          </button>
          <button
            onClick={() => handleTabChange("recent")}
            className={`text-lg font-semibold transition-colors ${
              activeTab === "recent" 
                ? "text-white" 
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Recent
          </button>
          {isSignedIn && (
            <button
              onClick={() => handleTabChange("mine")}
              className={`text-lg font-semibold transition-colors ${
                activeTab === "mine" 
                  ? "text-white" 
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              My Takes
              {myTakesStats && activeTab === "mine" && (
                <span className="ml-2 text-sm font-normal text-white/50">
                  ({myTakesStats.accuracy !== null ? `${myTakesStats.accuracy}%` : "—"}{myTakesStats.pending > 0 ? `, ${myTakesStats.pending} pending` : ""})
                </span>
              )}
            </button>
          )}
        </div>

        {/* Takes Grid */}
        {isLoading ? (
          <div className="py-12" />
        ) : takes.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            {activeTab === "mine" 
              ? "You haven't made any takes yet. Lock one in above!"
              : "No takes yet. Be the first to lock one in!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {takes.map((take) => (
              <ReceiptCard key={take.id} take={take} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-sm">
          <p>Receipts — Lock in your predictions. Prove you were right.</p>
        </div>
      </footer>
    </div>
  );
}
