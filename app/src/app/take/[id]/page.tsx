import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ShareButtons } from "@/components/ShareButtons";
import { Header } from "@/components/Header";

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

  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `${take.author}'s Take | Receipts`,
    description: take.text,
    openGraph: {
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Receipt for ${take.author}'s take: "${take.text.slice(0, 60)}..."`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
      images: [ogImageUrl],
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
      <Header />

      {/* Take Detail */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-white/50 hover:text-white/80 mb-8 text-sm"
        >
          ← Back to all takes
        </Link>

        {/* Receipt Card - Portrait oriented like a real receipt */}
        <div className="flex justify-center">
          <div className="w-[340px] bg-receipt-paper text-receipt-text font-mono relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded">
            {/* Perforated top edge */}
            <div className="receipt-edge-top" />

            {/* Content */}
            <div className="px-6 pt-10 pb-10">
              {/* Header */}
              <div className="text-center pb-5 border-b-2 border-dashed border-receipt-divider mb-5">
                <div className="text-base font-semibold tracking-[4px] text-receipt-text-light">
                  RECEIPTS
                </div>
                <div className="text-[0.55rem] text-receipt-text-faded tracking-wider">
                  HOT TAKES • LOCKED IN
                </div>
              </div>

              {/* Take text */}
              <div className="text-xl leading-relaxed py-6 px-2 text-center font-bold text-black">
                &ldquo;{take.text}&rdquo;
              </div>

              {/* Divider */}
              <hr className="border-t border-dashed border-receipt-divider my-4" />

              {/* Meta rows */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-receipt-text-muted">FROM</span>
                  <span className="font-semibold">@{take.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-receipt-text-muted">LOCKED</span>
                  <span className="font-semibold">{formatDate(take.lockedAt)}</span>
                </div>
                {take.resolvesAt && (
                  <div className="flex justify-between">
                    <span className="text-receipt-text-muted">RESOLVES</span>
                    <span className="font-semibold">{formatDate(take.resolvesAt)}</span>
                  </div>
                )}
              </div>

              {/* Status section */}
              <div className="text-center pt-5 mt-4 border-t-2 border-dashed border-receipt-divider">
                <StatusBadge status={take.status} />
                {take.hash && (
                  <div className="text-[0.6rem] text-receipt-text-faded mt-2 font-mono break-all">
                    #{take.hash}
                  </div>
                )}
              </div>
            </div>

            {/* Perforated bottom edge */}
            <div className="receipt-edge-bottom" />
          </div>
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
