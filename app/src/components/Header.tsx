"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Flame } from "lucide-react";

// Dynamically import Clerk components only when configured
const ClerkAuth = dynamic(
  () => import("./ClerkAuth").then(mod => mod.ClerkAuth),
  { ssr: false }
);

export function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity shrink-0">
          <span className="text-xl sm:text-2xl">🧾</span>
          <span className="font-bold text-lg sm:text-xl tracking-tight">Receipts</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#create"
            className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-orange-500/25"
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Hot Take</span>
          </Link>
          <ClerkAuth />
        </div>
      </div>
    </header>
  );
}
