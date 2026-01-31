import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// OG Image dimensions - 2x for crisp images
const WIDTH = 2400;
const HEIGHT = 1260;
const S = 2; // Scale factor for all internal elements

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
      return { bg: "#16a34a", text: "#ffffff" };
    case "WRONG":
      return { bg: "#dc2626", text: "#ffffff" };
    default:
      return COLORS.pending;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "VERIFIED":
      return "TRUE";
    case "WRONG":
      return "FALSE";
    default:
      return "PENDING";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const url = new URL(request.url);
  const position = url.searchParams.get("position");

  const take = await prisma.take.findUnique({
    where: { id },
  });

  if (!take) {
    return new Response("Take not found", { status: 404 });
  }

  const statusColors = getStatusColors(take.status);
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
        {/* Receipt card */}
        <div
          style={{
            width: 340 * S,
            backgroundColor: COLORS.paper,
            borderRadius: 8 * S,
            display: "flex",
            flexDirection: "column",
            boxShadow: `0 ${20 * S}px ${60 * S}px rgba(0,0,0,0.4)`,
            overflow: "hidden",
          }}
        >
          {/* Perforated top edge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6 * S,
              padding: `${10 * S}px 0`,
              borderBottom: `${1 * S}px dashed ${COLORS.divider}`,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6 * S,
                  height: 6 * S,
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1f",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div
            style={{
              padding: `${24 * S}px ${28 * S}px`,
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
                paddingBottom: 16 * S,
                borderBottom: `${2 * S}px dashed ${COLORS.divider}`,
                marginBottom: 16 * S,
              }}
            >
              <div
                style={{
                  fontSize: 16 * S,
                  fontWeight: 600,
                  letterSpacing: 4 * S,
                  color: COLORS.textLight,
                }}
              >
                RECEIPTS
              </div>
              <div
                style={{
                  fontSize: 8 * S,
                  color: COLORS.textFaded,
                  letterSpacing: 2 * S,
                  marginTop: 4 * S,
                }}
              >
                HOT TAKES • LOCKED IN
              </div>
              <div
                style={{
                  fontSize: 9 * S,
                  color: COLORS.textFaded,
                  marginTop: 6 * S,
                }}
              >
                {truncateHash(take.hash)}
              </div>
            </div>

            {/* Take text */}
            <div
              style={{
                fontSize: 20 * S,
                lineHeight: 1.4,
                padding: `${20 * S}px ${8 * S}px`,
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
                borderTop: `${1 * S}px dashed ${COLORS.divider}`,
                margin: `${12 * S}px 0`,
              }}
            />

            {/* Meta rows */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12 * S,
                marginBottom: 6 * S,
              }}
            >
              <span style={{ color: COLORS.textMuted }}>FROM</span>
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {take.author}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12 * S,
                marginBottom: 6 * S,
              }}
            >
              <span style={{ color: COLORS.textMuted }}>LOCKED</span>
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {formatDate(take.lockedAt)}
              </span>
            </div>

            {/* User's Position */}
            {position && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12 * S,
                  marginTop: 6 * S,
                  marginBottom: 6 * S,
                }}
              >
                <span style={{ color: COLORS.textMuted }}>MY POSITION</span>
                <span
                  style={{
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6 * S,
                    color: position === "AGREE" ? "#15803d" : "#b91c1c",
                  }}
                >
                  {position === "AGREE" ? "👍" : "👎"} {position === "AGREE" ? "AGREED" : "DISAGREED"}
                </span>
              </div>
            )}

            {/* Status section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 16 * S,
                marginTop: 12 * S,
                borderTop: `${2 * S}px dashed ${COLORS.divider}`,
              }}
            >
              <div
                style={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  padding: `${8 * S}px ${20 * S}px`,
                  borderRadius: 4 * S,
                  fontSize: 12 * S,
                  fontWeight: 700,
                  letterSpacing: 3 * S,
                }}
              >
                {getStatusLabel(take.status)}
              </div>

              {take.resolvesAt && (
                <div
                  style={{
                    fontSize: 10 * S,
                    color: COLORS.textLight,
                    marginTop: 10 * S,
                    display: "flex",
                  }}
                >
                  {take.status === "PENDING" ? "Resolves" : "Resolved"}{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      color: COLORS.text,
                      marginLeft: 4 * S,
                    }}
                  >
                    {formatDate(take.resolvesAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Perforated bottom edge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6 * S,
              padding: `${10 * S}px 0`,
              borderTop: `${1 * S}px dashed ${COLORS.divider}`,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6 * S,
                  height: 6 * S,
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
