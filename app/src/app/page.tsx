"use client";

import { useState, useEffect } from "react";
import { ReceiptCard } from "@/components/ReceiptCard";
import { TakeForm } from "@/components/TakeForm";
import { Header } from "@/components/Header";
import type { Take } from "@/lib/types";

export default function Home() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTakes = async () => {
    try {
      const response = await fetch("/api/takes");
      if (response.ok) {
        const data = await response.json();
        setTakes(data);
      }
    } catch (error) {
      console.error("Failed to fetch takes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTakes();
  }, []);

  const handleNewTake = (newTake: Take) => {
    setTakes([newTake, ...takes]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
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
        <div className="flex justify-center mb-16">
          <TakeForm onSuccess={handleNewTake} />
        </div>
      </section>

      {/* Recent Takes */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold mb-8 text-white/80">
          Recent Takes
        </h2>
        {isLoading ? (
          <div className="text-center text-white/50 py-12">
            Loading takes...
          </div>
        ) : takes.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            No takes yet. Be the first to lock one in!
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
