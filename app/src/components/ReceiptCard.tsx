import Link from "next/link";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { Take, TakeStatus } from "@/lib/types";

interface ReceiptCardProps {
  take: Take & { 
    userPosition?: "AGREE" | "DISAGREE" | null;
    agreeCount?: number;
    disagreeCount?: number;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateWithTime(dateStr: string): string {
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  // Check if time is not midnight (00:00) - if so, show time
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours !== 0 || minutes !== 0) {
    const timeFormatted = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} @ ${timeFormatted}`;
  }
  
  return dateFormatted;
}

// Check if a date has a specific time (not midnight)
function hasSpecificTime(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

// Always show time for locked date when resolution has specific time
function formatLockedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateFormatted} @ ${timeFormatted}`;
}

function truncateHash(hash: string | null): string {
  if (!hash) return "#--------...----";
  return `#${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function StatusBadge({ status }: { status: TakeStatus }) {
  const styles = {
    PENDING: "bg-status-pending-bg text-status-pending-text",
    VERIFIED: "bg-green-600 text-white",
    WRONG: "bg-red-600 text-white",
  };

  const labels = {
    PENDING: "PENDING",
    VERIFIED: "TRUE",
    WRONG: "FALSE",
  };

  return (
    <span
      className={`inline-block px-5 py-2 text-sm font-bold rounded tracking-widest ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function ReceiptCard({ take }: ReceiptCardProps) {
  const hasEngagement = (take.agreeCount || 0) > 0 || (take.disagreeCount || 0) > 0;
  
  return (
    <Link href={`/take/${take.id}`} className="block hover:opacity-95 transition-opacity">
      <div className="w-[340px] bg-receipt-paper text-receipt-text font-mono relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded cursor-pointer">
        {/* Perforated top edge */}
        <div className="receipt-edge-top" />

        {/* Content with padding to account for edges */}
        <div className="px-6 pt-10 pb-10">
          {/* Header */}
          <div className="text-center pb-5 border-b-2 border-dashed border-receipt-divider mb-5">
            <div className="text-base font-semibold tracking-[4px] text-receipt-text-light">
              RECEIPTS
            </div>
            <div className="text-[0.55rem] text-receipt-text-faded tracking-wider">
              HOT TAKES • LOCKED IN
            </div>
            <div className="text-[0.6rem] text-receipt-text-faded mt-1.5 font-mono">
              {truncateHash(take.hash)}
            </div>
          </div>

          {/* Take text */}
          <div className="text-xl leading-relaxed py-6 px-2 text-center font-bold text-black">
            &ldquo;{take.text}&rdquo;
          </div>

          {/* Divider */}
          <hr className="border-t border-dashed border-receipt-divider my-4" />

          {/* Meta rows */}
          <div className="flex justify-between text-xs mb-2">
            <span className="text-receipt-text-muted">FROM</span>
            <span className="font-semibold">{take.author}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-receipt-text-muted">LOCKED</span>
            <span className="font-semibold">
              {hasSpecificTime(take.resolvesAt) 
                ? formatLockedDate(take.lockedAt) 
                : formatDate(take.lockedAt)}
            </span>
          </div>

          {/* Community engagement */}
          {hasEngagement && (
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-receipt-text-muted">COMMUNITY</span>
              <span className="flex items-center gap-3 font-semibold">
                <span className="flex items-center gap-1 text-green-700">
                  <ThumbsUp className="w-3 h-3" />
                  {take.agreeCount || 0}
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <ThumbsDown className="w-3 h-3" />
                  {take.disagreeCount || 0}
                </span>
              </span>
            </div>
          )}

          {/* User's position if they have one */}
          {take.userPosition && (
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-receipt-text-muted">MY POSITION</span>
              <span className={`font-bold flex items-center gap-1 ${
                take.userPosition === "AGREE" ? "text-green-700" : "text-red-700"
              }`}>
                {take.userPosition === "AGREE" ? (
                  <>
                    <ThumbsUp className="w-3 h-3" />
                    AGREED
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-3 h-3" />
                    DISAGREED
                  </>
                )}
              </span>
            </div>
          )}

          {/* Status section */}
          <div className="text-center pt-5 mt-4 border-t-2 border-dashed border-receipt-divider">
            <StatusBadge status={take.status} />
            {take.resolvesAt && (
              <div className="text-[0.7rem] text-receipt-text-light mt-2.5">
                {take.status === "PENDING" ? "Resolves" : "Resolved"}{" "}
                <span className="font-semibold text-receipt-text">
                  {formatDateWithTime(take.resolvesAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Perforated bottom edge */}
        <div className="receipt-edge-bottom" />
      </div>
    </Link>
  );
}
