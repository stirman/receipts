"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ReceiptCard } from "@/components/ReceiptCard";
import { Header } from "@/components/Header";
import type { Take } from "@/lib/types";

type TakeWithPosition = Take & { 
  userPosition?: "AGREE" | "DISAGREE" | null;
  agreeCount?: number;
  disagreeCount?: number;
};

type SortType = "recent" | "engagement";
type ViewType = "takes" | "positions";

interface Stats {
  total: number;
  pending: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
}

export default function MyTakesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [takes, setTakes] = useState<TakeWithPosition[]>([]);
  const [positions, setPositions] = useState<TakeWithPosition[]>([]);
  const [takesStats, setTakesStats] = useState<Stats | null>(null);
  const [positionsStats, setPositionsStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>("recent");
  const [activeView, setActiveView] = useState<ViewType>("takes");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) {
      fetchData();
    }
  }, [isSignedIn, sortBy]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch both takes and positions
      const [takesRes, positionsRes] = await Promise.all([
        fetch(`/api/takes/mine?sort=${sortBy}`),
        fetch(`/api/takes/positions`),
      ]);
      
      if (takesRes.ok) {
        const data = await takesRes.json();
        setTakes(data.takes || []);
        setTakesStats(data.stats);
      }
      
      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.takes || []);
        setPositionsStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  const currentItems = activeView === "takes" ? takes : positions;
  const currentStats = activeView === "takes" ? takesStats : positionsStats;

  return (
    <div className="min-h-screen text-white relative">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* View Toggle */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={() => setActiveView("takes")}
            className={`text-2xl font-bold transition-colors ${
              activeView === "takes" 
                ? "text-white" 
                : "text-white/40 hover:text-white/60"
            }`}
          >
            My Takes
            {takesStats && (
              <span className="ml-2 text-sm font-normal text-white/50">
                ({takesStats.total})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView("positions")}
            className={`text-2xl font-bold transition-colors ${
              activeView === "positions" 
                ? "text-white" 
                : "text-white/40 hover:text-white/60"
            }`}
          >
            My Positions
            {positionsStats && (
              <span className="ml-2 text-sm font-normal text-white/50">
                ({positionsStats.total})
              </span>
            )}
          </button>
        </div>

        {/* Stats */}
        {currentStats && (
          <div className="flex flex-wrap gap-6 text-sm mb-8">
            <div>
              <span className="text-white/50">Total: </span>
              <span className="font-semibold">{currentStats.total}</span>
            </div>
            <div>
              <span className="text-white/50">Pending: </span>
              <span className="font-semibold text-amber-400">{currentStats.pending}</span>
            </div>
            <div>
              <span className="text-white/50">Correct: </span>
              <span className="font-semibold text-green-400">{currentStats.correct}</span>
            </div>
            <div>
              <span className="text-white/50">Incorrect: </span>
              <span className="font-semibold text-red-400">{currentStats.incorrect}</span>
            </div>
            {currentStats.accuracy !== null && (
              <div>
                <span className="text-white/50">Accuracy: </span>
                <span className={`font-semibold ${
                  currentStats.accuracy >= 50 ? "text-green-400" : "text-red-400"
                }`}>
                  {currentStats.accuracy}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sort Options (only for takes) */}
        {activeView === "takes" && (
          <div className="flex items-center gap-4 mb-8">
            <span className="text-white/50 text-sm">Sort by:</span>
            <button
              onClick={() => setSortBy("recent")}
              className={`text-sm font-medium transition-colors ${
                sortBy === "recent" 
                  ? "text-white" 
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy("engagement")}
              className={`text-sm font-medium transition-colors ${
                sortBy === "engagement" 
                  ? "text-white" 
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Most Action
            </button>
          </div>
        )}

        {/* Items Grid */}
        {isLoading ? (
          <div className="text-center text-white/50 py-12">
            Loading...
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            {activeView === "takes" 
              ? "You haven't made any takes yet. Go lock one in!"
              : "You haven't taken any positions yet. Browse trending takes and pick a side!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {currentItems.map((take) => (
              <ReceiptCard key={take.id} take={take} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-sm">
          <p>Created by <a href="https://x.com/stirman" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">@stirman</a>. Copyright 2026.</p>
        </div>
      </footer>
    </div>
  );
}
