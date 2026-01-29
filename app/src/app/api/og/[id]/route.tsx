import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// Use Node.js runtime (50MB limit) instead of Edge (1MB limit)

// OG Image dimensions
const WIDTH = 1200;
const HEIGHT = 630;

// Colors matching our design system
const COLORS = {
  paper: "#fafaf8",
  text: "#2c2c2c",
  textLight: "#444",
  textMuted: "#888",
  textFaded: "#aaa",
  divider: "#e0e0e0",
  pending: {
    bg: "#fef3c7",
    text: "#92400e",
  },
  verified: {
    bg: "#dcfce7",
    text: "#166534",
  },
  wrong: {
    bg: "#fee2e2",
    text: "#991b1b",
  },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateHash(hash: string | null): string {
  if (!hash) return "#--------...----";
  return `#${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function getStatusColors(status: string) {
  switch (status) {
    case "VERIFIED":
      return COLORS.verified;
    case "WRONG":
      return COLORS.wrong;
    default:
      return COLORS.pending;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch the take from database
  const take = await prisma.take.findUnique({
    where: { id },
  });

  if (!take) {
    return new Response("Take not found", { status: 404 });
  }

  const statusColors = getStatusColors(take.status);

  // Truncate long takes for better display
  const displayText =
    take.text.length > 140 ? take.text.slice(0, 140) + "..." : take.text;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1f",
          fontFamily: "monospace",
        }}
      >
        {/* Receipt card - portrait oriented like a real receipt */}
        <div
          style={{
            width: 340,
            backgroundColor: COLORS.paper,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Perforated top edge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderBottom: `1px dashed ${COLORS.divider}`,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1f",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div
            style={{
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingBottom: 16,
                borderBottom: `2px dashed ${COLORS.divider}`,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "4px",
                  color: COLORS.textLight,
                }}
              >
                RECEIPTS
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: COLORS.textFaded,
                  letterSpacing: "2px",
                  marginTop: 4,
                }}
              >
                HOT TAKES • LOCKED IN
              </div>
            </div>

            {/* Take text */}
            <div
              style={{
                fontSize: 20,
                lineHeight: 1.4,
                padding: "20px 8px",
                textAlign: "center",
                fontWeight: 700,
                color: "#000",
                display: "flex",
                justifyContent: "center",
              }}
            >
              &ldquo;{displayText}&rdquo;
            </div>

            {/* Divider */}
            <div
              style={{
                width: "100%",
                borderTop: `1px dashed ${COLORS.divider}`,
                margin: "12px 0",
              }}
            />

            {/* Meta rows */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ color: COLORS.textMuted }}>FROM</span>
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                @{take.author}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ color: COLORS.textMuted }}>LOCKED</span>
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {formatDate(take.lockedAt)}
              </span>
            </div>

            {/* Status section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 16,
                marginTop: 12,
                borderTop: `2px dashed ${COLORS.divider}`,
              }}
            >
              {/* Status badge */}
              <div
                style={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  padding: "8px 20px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "3px",
                }}
              >
                {take.status}
              </div>

              {/* Resolve date for pending */}
              {take.status === "PENDING" && take.resolvesAt && (
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textLight,
                    marginTop: 10,
                    display: "flex",
                  }}
                >
                  Resolves{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      color: COLORS.text,
                      marginLeft: 4,
                    }}
                  >
                    {formatDate(take.resolvesAt)}
                  </span>
                </div>
              )}

              {/* Hash */}
              <div
                style={{
                  fontSize: 9,
                  color: COLORS.textFaded,
                  marginTop: 10,
                }}
              >
                {truncateHash(take.hash)}
              </div>
            </div>
          </div>

          {/* Perforated bottom edge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderTop: `1px dashed ${COLORS.divider}`,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1f",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
