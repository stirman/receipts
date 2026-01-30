"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { AgreementSection } from "./AgreementSection";
import { ShareButtons } from "./ShareButtons";

interface TakeDetailProps {
  take: {
    id: string;
    text: string;
    author: string;
    hash: string | null;
    status: string;
    lockedAt: string;
    resolvesAt: string | null;
    resolvedAt: string | null;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PENDING: "PENDING",
    VERIFIED: "TRUE",
    WRONG: "FALSE",
  };

  const styles: Record<string, string> = {
    PENDING: "bg-status-pending-bg text-status-pending-text",
    VERIFIED: "bg-green-600 text-white",
    WRONG: "bg-red-600 text-white",
  };

  return (
    <span
      className={`inline-block px-5 py-2 text-sm font-bold rounded tracking-widest ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function TakeDetail({ take }: TakeDetailProps) {
  const [userPosition, setUserPosition] = useState<"AGREE" | "DISAGREE" | null>(null);

  return (
    <>
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
              {take.hash && (
                <div className="text-[0.6rem] text-receipt-text-faded mt-1.5 font-mono">
                  #{take.hash.slice(0, 8)}...{take.hash.slice(-4)}
                </div>
              )}
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
            </div>

            {/* User's position on this take (if they agreed/disagreed) */}
            {userPosition && (
              <>
                <hr className="border-t border-dashed border-receipt-divider my-4" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-receipt-text-muted">MY POSITION</span>
                  <span className={`font-bold flex items-center gap-1.5 ${
                    userPosition === "AGREE" ? "text-green-700" : "text-red-700"
                  }`}>
                    {userPosition === "AGREE" ? (
                      <>
                        <ThumbsUp className="w-3.5 h-3.5" />
                        AGREED
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-3.5 h-3.5" />
                        DISAGREED
                      </>
                    )}
                  </span>
                </div>
              </>
            )}

            {/* Status section */}
            <div className="text-center pt-5 mt-4 border-t-2 border-dashed border-receipt-divider">
              <StatusBadge status={take.status} />
              {take.resolvesAt && (
                <div className="text-[0.7rem] text-receipt-text-light mt-2.5">
                  {take.status === "PENDING" ? "Resolves" : "Resolved"}{" "}
                  <span className="font-semibold text-receipt-text">
                    {formatDate(take.resolvesAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Perforated bottom edge */}
          <div className="receipt-edge-bottom" />
        </div>
      </div>

      {/* Agreement Section */}
      <AgreementSection 
        takeId={take.id} 
        status={take.status} 
        authorUsername={take.author}
        onPositionChange={setUserPosition}
      />

      {/* Share section */}
      <div className="mt-8 text-center">
        <p className="text-white/50 text-sm mb-4">Share this receipt</p>
        <ShareButtons takeId={take.id} />
      </div>
    </>
  );
}
