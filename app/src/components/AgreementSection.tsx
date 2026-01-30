"use client";

import { useState, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface Agreement {
  id: string;
  username: string;
  createdAt: string;
}

interface AgreementData {
  agrees: Agreement[];
  disagrees: Agreement[];
  agreeCount: number;
  disagreeCount: number;
  userPosition: "AGREE" | "DISAGREE" | null;
}

interface AgreementSectionProps {
  takeId: string;
  status: string;
}

export function AgreementSection({ takeId, status }: AgreementSectionProps) {
  const { isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isResolved = status !== "PENDING";

  useEffect(() => {
    fetchAgreements();
  }, [takeId]);

  async function fetchAgreements() {
    try {
      const res = await fetch(`/api/take/${takeId}/agreements`);
      if (res.ok) {
        const agreementData = await res.json();
        setData(agreementData);
      }
    } catch (error) {
      console.error("Failed to fetch agreements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(position: "AGREE" | "DISAGREE") {
    if (!isSignedIn) {
      // Store intended action and redirect to sign in
      sessionStorage.setItem("pendingVote", JSON.stringify({ takeId, position }));
      redirectToSignIn({ redirectUrl: `/take/${takeId}` });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = position === "AGREE" ? "agree" : "disagree";
      const res = await fetch(`/api/take/${takeId}/${endpoint}`, {
        method: "POST",
      });

      if (res.ok) {
        await fetchAgreements();
      } else {
        const error = await res.json();
        console.error("Vote failed:", error);
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveVote() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/take/${takeId}/agree`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchAgreements();
      }
    } catch (error) {
      console.error("Failed to remove vote:", error);
    } finally {
      setSubmitting(false);
    }
  }

  // Check for pending vote after sign in
  useEffect(() => {
    if (isSignedIn) {
      const pendingVote = sessionStorage.getItem("pendingVote");
      if (pendingVote) {
        const { takeId: pendingTakeId, position } = JSON.parse(pendingVote);
        if (pendingTakeId === takeId) {
          sessionStorage.removeItem("pendingVote");
          handleVote(position);
        }
      }
    }
  }, [isSignedIn, takeId]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-white/50">
        Loading agreements...
      </div>
    );
  }

  const agreeCount = data?.agreeCount ?? 0;
  const disagreeCount = data?.disagreeCount ?? 0;
  const userPosition = data?.userPosition;

  return (
    <div className="mt-8 w-full max-w-md mx-auto">
      {/* Vote Buttons - Only show for pending takes */}
      {!isResolved && (
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => userPosition === "AGREE" ? handleRemoveVote() : handleVote("AGREE")}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              userPosition === "AGREE"
                ? "bg-green-600 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <ThumbsUp className="w-5 h-5" />
            <span>Agree ({agreeCount})</span>
          </button>
          
          <button
            onClick={() => userPosition === "DISAGREE" ? handleRemoveVote() : handleVote("DISAGREE")}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              userPosition === "DISAGREE"
                ? "bg-red-600 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <ThumbsDown className="w-5 h-5" />
            <span>Disagree ({disagreeCount})</span>
          </button>
        </div>
      )}

      {/* Resolution message */}
      {isResolved && (agreeCount > 0 || disagreeCount > 0) && (
        <div className="text-center text-white/50 text-sm mb-4">
          Final count: {agreeCount} agreed, {disagreeCount} disagreed
        </div>
      )}

      {/* Agreement Lists */}
      {(agreeCount > 0 || disagreeCount > 0) && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Agree Column */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" />
              Agree ({agreeCount})
            </h3>
            <ul className="space-y-2">
              {data?.agrees.map((agreement) => (
                <li key={agreement.id} className="text-white/70 text-sm">
                  @{agreement.username}
                </li>
              ))}
              {agreeCount === 0 && (
                <li className="text-white/30 text-sm italic">No one yet</li>
              )}
            </ul>
          </div>

          {/* Disagree Column */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <ThumbsDown className="w-4 h-4" />
              Disagree ({disagreeCount})
            </h3>
            <ul className="space-y-2">
              {data?.disagrees.map((agreement) => (
                <li key={agreement.id} className="text-white/70 text-sm">
                  @{agreement.username}
                </li>
              ))}
              {disagreeCount === 0 && (
                <li className="text-white/30 text-sm italic">No one yet</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
