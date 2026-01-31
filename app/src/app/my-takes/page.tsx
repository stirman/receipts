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
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>("recent");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) {
      fetchTakes();
    }
  }, [isSignedIn, sortBy]);

  const fetchTakes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/takes/mine?sort=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setTakes(data.takes || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch takes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen text-white relative">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-4">My Takes</h1>
          
          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-white/50">Total: </span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div>
                <span className="text-white/50">Pending: </span>
                <span className="font-semibold text-amber-400">{stats.pending}</span>
              </div>
              <div>
                <span className="text-white/50">Correct: </span>
                <span className="font-semibold text-green-400">{stats.correct}</span>
              </div>
              <div>
                <span className="text-white/50">Incorrect: </span>
                <span className="font-semibold text-red-400">{stats.incorrect}</span>
              </div>
              {stats.accuracy !== null && (
                <div>
                  <span className="text-white/50">Accuracy: </span>
                  <span className={`font-semibold ${
                    stats.accuracy >= 50 ? "text-green-400" : "text-red-400"
                  }`}>
                    {stats.accuracy}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sort Options */}
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

        {/* Takes Grid */}
        {isLoading ? (
          <div className="text-center text-white/50 py-12">
            Loading your takes...
          </div>
        ) : takes.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            You haven&apos;t made any takes yet. Go lock one in!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {takes.map((take) => (
              <ReceiptCard key={take.id} take={take} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-sm">
          <p>Receipts — Lock in your predictions. Prove you were right.</p>
        </div>
      </footer>
    </div>
  );
}
