"use client";

import { useState, useEffect } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

interface AgreementData {
  agreeCount: number;
  disagreeCount: number;
  userPosition: "AGREE" | "DISAGREE" | null;
}

interface AgreementSectionProps {
  takeId: string;
  status: string;
  authorUsername: string;
  onPositionChange?: (position: "AGREE" | "DISAGREE" | null) => void;
}

export function AgreementSection({ takeId, status, authorUsername, onPositionChange }: AgreementSectionProps) {
  const { isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  const { user } = useUser();
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; position: "AGREE" | "DISAGREE" | null }>({
    isOpen: false,
    position: null,
  });

  const isResolved = status !== "PENDING";
  
  // Check if viewing own take
  const currentUsername = user?.username || user?.firstName || "";
  const isOwnTake = currentUsername.toLowerCase() === authorUsername.toLowerCase();

  useEffect(() => {
    fetchAgreements();
  }, [takeId]);

  async function fetchAgreements() {
    try {
      const res = await fetch(`/api/take/${takeId}/agreements`);
      if (res.ok) {
        const agreementData = await res.json();
        setData(agreementData);
        // Notify parent of position change
        onPositionChange?.(agreementData.userPosition);
      }
    } catch (error) {
      console.error("Failed to fetch agreements:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleVoteClick(position: "AGREE" | "DISAGREE") {
    // If user already has a position, don't allow changing
    if (data?.userPosition) return;
    
    if (!isSignedIn) {
      // Store intended action and redirect to sign in
      sessionStorage.setItem("pendingVote", JSON.stringify({ takeId, position }));
      redirectToSignIn({ redirectUrl: `/take/${takeId}` });
      return;
    }

    // Show confirmation modal
    setConfirmModal({ isOpen: true, position });
  }

  async function handleConfirmedVote() {
    if (!confirmModal.position) return;
    
    setSubmitting(true);
    try {
      const endpoint = confirmModal.position === "AGREE" ? "agree" : "disagree";
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

  // Check for pending vote after sign in
  useEffect(() => {
    if (isSignedIn && !data?.userPosition) {
      const pendingVote = sessionStorage.getItem("pendingVote");
      if (pendingVote) {
        const { takeId: pendingTakeId, position } = JSON.parse(pendingVote);
        if (pendingTakeId === takeId) {
          sessionStorage.removeItem("pendingVote");
          setConfirmModal({ isOpen: true, position });
        }
      }
    }
  }, [isSignedIn, takeId, data?.userPosition]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-white/50">
        Loading...
      </div>
    );
  }

  const agreeCount = data?.agreeCount ?? 0;
  const disagreeCount = data?.disagreeCount ?? 0;
  const userPosition = data?.userPosition;

  return (
    <div className="mt-8 w-full max-w-md mx-auto">
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, position: null })}
        onConfirm={handleConfirmedVote}
        title={confirmModal.position === "AGREE" ? "Lock in your agreement?" : "Lock in your disagreement?"}
        message="Once you take a position, it's locked in permanently. You won't be able to change it later."
        confirmText="Confirm"
        confirmColor={confirmModal.position === "AGREE" ? "green" : "red"}
      />

      {/* Vote Buttons / Static Counts */}
      {!isResolved && (
        <div className="flex gap-4 justify-center mb-6">
          {isOwnTake ? (
            // Own take: show plain text counts, no button styling
            <>
              <div className="flex items-center gap-2 text-green-400">
                <ThumbsUp className="w-5 h-5" />
                <span>{agreeCount}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <ThumbsDown className="w-5 h-5" />
                <span>{disagreeCount}</span>
              </div>
            </>
          ) : userPosition ? (
            // Already voted: show locked position with counts
            <>
              <div className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
                userPosition === "AGREE" 
                  ? "bg-green-600 text-white ring-2 ring-green-400" 
                  : "bg-white/10 text-white/50"
              }`}>
                <ThumbsUp className="w-5 h-5" />
                <span>Agree ({agreeCount})</span>
              </div>
              <div className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
                userPosition === "DISAGREE" 
                  ? "bg-red-600 text-white ring-2 ring-red-400" 
                  : "bg-white/10 text-white/50"
              }`}>
                <ThumbsDown className="w-5 h-5" />
                <span>Disagree ({disagreeCount})</span>
              </div>
            </>
          ) : (
            // Not voted yet: interactive buttons
            <>
              <button
                onClick={() => handleVoteClick("AGREE")}
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-green-600 text-white hover:bg-green-500 ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span>Agree ({agreeCount})</span>
              </button>
              
              <button
                onClick={() => handleVoteClick("DISAGREE")}
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-red-600 text-white hover:bg-red-500 ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ThumbsDown className="w-5 h-5" />
                <span>Disagree ({disagreeCount})</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Resolution message */}
      {isResolved && (agreeCount > 0 || disagreeCount > 0) && (
        <div className="text-center text-white/50 text-sm">
          Final count: {agreeCount} agreed, {disagreeCount} disagreed
        </div>
      )}
    </div>
  );
}
