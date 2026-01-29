export type TakeStatus = "pending" | "verified" | "wrong";

export interface Take {
  id: string;
  text: string;
  username: string;
  lockedAt: Date;
  resolvesAt: Date;
  status: TakeStatus;
  hash: string;
}

interface ReceiptCardProps {
  take: Take;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateHash(hash: string): string {
  return `#${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function StatusBadge({ status }: { status: TakeStatus }) {
  const styles = {
    pending: "bg-status-pending-bg text-status-pending-text",
    verified: "bg-status-verified-bg text-status-verified-text",
    wrong: "bg-status-wrong-bg text-status-wrong-text",
  };

  const labels = {
    pending: "⏳ PENDING",
    verified: "✅ VERIFIED",
    wrong: "❌ WRONG",
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
  return (
    <div className="w-[340px] bg-receipt-paper text-receipt-text font-mono relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded">
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
          <span className="font-semibold">@{take.username}</span>
        </div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-receipt-text-muted">LOCKED</span>
          <span className="font-semibold">{formatDate(take.lockedAt)}</span>
        </div>

        {/* Status section */}
        <div className="text-center pt-5 mt-4 border-t-2 border-dashed border-receipt-divider">
          <StatusBadge status={take.status} />
          {take.status === "pending" && (
            <div className="text-[0.7rem] text-receipt-text-light mt-2.5">
              Resolves{" "}
              <span className="font-semibold text-receipt-text">
                {formatDate(take.resolvesAt)}
              </span>
            </div>
          )}
          <div className="text-[0.6rem] text-receipt-text-faded mt-2 font-mono">
            {truncateHash(take.hash)}
          </div>
        </div>
      </div>

      {/* Perforated bottom edge */}
      <div className="receipt-edge-bottom" />
    </div>
  );
}
