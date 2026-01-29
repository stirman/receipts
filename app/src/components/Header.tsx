"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import Clerk components only when configured
const ClerkAuth = dynamic(
  () => import("./ClerkAuth").then(mod => mod.ClerkAuth),
  { ssr: false }
);

export function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🧾</span>
          <span className="font-bold text-xl tracking-tight">Receipts</span>
        </Link>
        <div className="flex items-center gap-4">
          <p className="text-white/50 text-sm hidden sm:block">
            Hot takes with proof
          </p>
          <ClerkAuth />
        </div>
      </div>
    </header>
  );
}
