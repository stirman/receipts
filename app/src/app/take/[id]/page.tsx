import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ShareButtons } from "@/components/ShareButtons";

interface TakePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TakePageProps): Promise<Metadata> {
  const { id } = await params;
  const take = await prisma.take.findUnique({ where: { id } });

  if (!take) {
    return { title: "Take Not Found | Receipts" };
  }

  return {
    title: `${take.author}'s Take | Receipts`,
    description: take.text,
    openGraph: {
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
    },
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-status-pending-bg text-status-pending-text",
    VERIFIED: "bg-status-verified-bg text-status-verified-text",
    WRONG: "bg-status-wrong-bg text-status-wrong-text",
  };

  return (
    <span
      className={`inline-block px-5 py-2 text-sm font-bold rounded tracking-widest ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default async function TakePage({ params }: TakePageProps) {
  const { id } = await params;
  const take = await prisma.take.findUnique({ where: { id } });

  if (!take) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🧾</span>
            <span className="font-bold text-xl tracking-tight">Receipts</span>
          </Link>
          <p className="text-white/50 text-sm hidden sm:block">
            Hot takes with proof
          </p>
        </div>
      </header>

      {/* Take Detail */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-white/50 hover:text-white/80 mb-8 text-sm"
        >
          ← Back to all takes
        </Link>

        {/* Receipt Card - Large */}
        <div className="bg-receipt-paper text-receipt-text font-mono relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded">
          {/* Perforated top edge */}
          <div className="receipt-edge-top" />

          {/* Content */}
          <div className="px-8 pt-12 pb-12">
            {/* Header */}
            <div className="text-center pb-6 border-b-2 border-dashed border-receipt-divider mb-6">
              <div className="text-lg font-semibold tracking-[4px] text-receipt-text-light">
                RECEIPTS
              </div>
              <div className="text-xs text-receipt-text-faded tracking-wider">
                HOT TAKES • LOCKED IN
              </div>
            </div>

            {/* Take text */}
            <div className="text-2xl leading-relaxed py-8 px-4 text-center font-bold text-black">
              &ldquo;{take.text}&rdquo;
            </div>

            {/* Divider */}
            <hr className="border-t border-dashed border-receipt-divider my-6" />

            {/* Meta rows */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-receipt-text-muted">FROM</span>
                <span className="font-semibold">@{take.author}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-receipt-text-muted">LOCKED</span>
                <span className="font-semibold">{formatFullDate(take.lockedAt)}</span>
              </div>
              {take.resolvesAt && (
                <div className="flex justify-between">
                  <span className="text-receipt-text-muted">RESOLVES</span>
                  <span className="font-semibold">{formatDate(take.resolvesAt)}</span>
                </div>
              )}
            </div>

            {/* Status section */}
            <div className="text-center pt-8 mt-6 border-t-2 border-dashed border-receipt-divider">
              <StatusBadge status={take.status} />
              {take.hash && (
                <div className="text-xs text-receipt-text-faded mt-4 font-mono break-all">
                  #{take.hash}
                </div>
              )}
            </div>
          </div>

          {/* Perforated bottom edge */}
          <div className="receipt-edge-bottom" />
        </div>

        {/* Share section */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm mb-4">Share this receipt</p>
          <ShareButtons />
        </div>
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
