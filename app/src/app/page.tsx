"use client";

import { useState } from "react";
import { ReceiptCard, Take } from "@/components/ReceiptCard";
import { TakeForm } from "@/components/TakeForm";

// Sample data for demonstration
const sampleTakes: Take[] = [
  {
    id: "1",
    text: "Rockets will make the playoffs this season",
    username: "stirman",
    lockedAt: new Date("2026-01-29"),
    resolvesAt: new Date("2026-04-13"),
    status: "pending",
    hash: "7f3a9c2eb8d4f1a6c3e5b7d9f2a4c6e8b4d1",
  },
  {
    id: "2",
    text: "Jalen Green will average 25+ PPG",
    username: "rocketsfan",
    lockedAt: new Date("2026-01-15"),
    resolvesAt: new Date("2026-04-13"),
    status: "verified",
    hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
  },
  {
    id: "3",
    text: "Lakers winning the championship",
    username: "lakernation",
    lockedAt: new Date("2025-10-01"),
    resolvesAt: new Date("2026-06-15"),
    status: "wrong",
    hash: "f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1",
  },
];

function generateHash(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export default function Home() {
  const [takes, setTakes] = useState<Take[]>(sampleTakes);

  const handleNewTake = (text: string) => {
    const newTake: Take = {
      id: Date.now().toString(),
      text,
      username: "you",
      lockedAt: new Date(),
      resolvesAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: "pending",
      hash: generateHash(),
    };
    setTakes([newTake, ...takes]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <span className="font-bold text-xl tracking-tight">Receipts</span>
          </div>
          <p className="text-white/50 text-sm hidden sm:block">
            Hot takes with proof
          </p>
        </div>
      </header>

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
          <TakeForm onSubmit={handleNewTake} />
        </div>
      </section>

      {/* Recent Takes */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold mb-8 text-white/80">
          Recent Takes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {takes.map((take) => (
            <ReceiptCard key={take.id} take={take} />
          ))}
        </div>
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
