"use client";

import { useState, useEffect, useCallback } from "react";
import type { Take, AIVerificationResult } from "@/lib/types";

// Conditionally import Clerk - only use if configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamic imports for Clerk hooks - only used at runtime when configured
let useAuth: () => { isSignedIn: boolean | undefined };
let useUser: () => { user: { username?: string; firstName?: string } | null | undefined };
let SignInButton: React.ComponentType<{ mode?: string; fallbackRedirectUrl?: string; children: React.ReactNode }>;

if (isClerkConfigured) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerk = require("@clerk/nextjs");
  useAuth = clerk.useAuth;
  useUser = clerk.useUser;
  SignInButton = clerk.SignInButton;
} else {
  // Stub implementations when Clerk isn't configured
  useAuth = () => ({ isSignedIn: false });
  useUser = () => ({ user: null });
  SignInButton = ({ children }) => <>{children}</>;
}

interface TakeFormProps {
  onSuccess?: (take: Take) => void;
}

type FormStep = "input" | "verifying" | "confirm" | "signing_in" | "saving";

export function TakeForm({ onSuccess }: TakeFormProps) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [take, setTake] = useState("");
  const [step, setStep] = useState<FormStep>("input");
  const [verification, setVerification] = useState<AIVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState(false);

  const characterCount = take.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  const saveTake = useCallback(async () => {
    if (!verification) return;

    setStep("saving");
    setError(null);

    try {
      const displayText = verification.refinedTake || take.trim();
      const authorName = user?.username || user?.firstName || "Anonymous";

      const response = await fetch("/api/takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: displayText,
          author: authorName,
          verification: verification,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit take");
      }

      const newTake = await response.json();
      setTake("");
      setVerification(null);
      setStep("input");
      setPendingSave(false);
      onSuccess?.(newTake);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("confirm");
      setPendingSave(false);
    }
  }, [verification, take, user, onSuccess]);

  // Watch for sign-in completion when there's a pending save
  useEffect(() => {
    if (pendingSave && isSignedIn && step === "signing_in") {
      saveTake();
    }
  }, [isSignedIn, pendingSave, step, saveTake]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!take.trim()) return;

    setStep("verifying");
    setError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ take: take.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify take");
      }

      const result: AIVerificationResult = await response.json();
      setVerification(result);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("input");
    }
  };

  const handleLockIn = async () => {
    if (!verification) return;

    // If not signed in, show sign in prompt
    if (!isSignedIn) {
      setPendingSave(true);
      setStep("signing_in");
      return;
    }

    await saveTake();
  };

  const handleBack = () => {
    setStep("input");
    setVerification(null);
    setPendingSave(false);
  };

  // Input step
  if (step === "input") {
    return (
      <form onSubmit={handleVerify} className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <label
            htmlFor="take"
            className="block text-sm font-medium text-white/60 mb-2"
          >
            Lock in your take
          </label>
          <textarea
            id="take"
            value={take}
            onChange={(e) => setTake(e.target.value)}
            placeholder="The Rockets will make the playoffs this season..."
            className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30 transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <div className="flex justify-between items-center mt-3">
            <span
              className={`text-xs ${
                isOverLimit ? "text-red-400" : "text-white/40"
              }`}
            >
              {characterCount}/{maxCharacters}
            </span>
            <button
              type="submit"
              disabled={!take.trim() || isOverLimit}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              Verify Take
            </button>
          </div>
        </div>
        <p className="text-white/30 text-xs mt-3 text-center">
          AI will verify your prediction before locking it in.
        </p>
      </form>
    );
  }

  // Verifying step
  if (step === "verifying") {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
          <div className="animate-pulse">
            <div className="text-2xl mb-3">🤖</div>
            <p className="text-white/70">Analyzing your take...</p>
            <p className="text-white/40 text-sm mt-2">
              Checking if it&apos;s verifiable and extracting key details
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === "confirm" && verification) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="text-center mb-4">
            <div className="text-2xl mb-2">
              {verification.isVerifiable ? "✅" : "⚠️"}
            </div>
            <h3 className="font-semibold text-white">
              {verification.isVerifiable
                ? "Take Verified!"
                : "Needs More Clarity"}
            </h3>
          </div>

          {/* AI Interpretation */}
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-white/60 mb-2">
              I&apos;ll record this as:
            </p>
            <p className="text-white font-medium">
              &ldquo;{verification.refinedTake || take}&rdquo;
            </p>
          </div>

          {/* Structured data */}
          {verification.isVerifiable && (
            <div className="space-y-2 text-sm mb-4">
              {verification.subject && (
                <div className="flex justify-between">
                  <span className="text-white/50">Subject:</span>
                  <span className="text-white">{verification.subject}</span>
                </div>
              )}
              {verification.timeframe && (
                <div className="flex justify-between">
                  <span className="text-white/50">Timeframe:</span>
                  <span className="text-white">{verification.timeframe}</span>
                </div>
              )}
              {verification.suggestedResolutionDate && (
                <div className="flex justify-between">
                  <span className="text-white/50">Resolves:</span>
                  <span className="text-white">
                    {new Date(
                      verification.suggestedResolutionDate
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          <p className="text-white/50 text-xs mb-6">{verification.explanation}</p>

          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2.5 text-white/70 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-sm"
            >
              Edit Take
            </button>
            {verification.isVerifiable ? (
              <button
                onClick={handleLockIn}
                className="flex-1 px-4 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors text-sm"
              >
                Lock It In
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors text-sm"
              >
                Make It Clearer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sign in step
  if (step === "signing_in") {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
          <div className="text-3xl mb-4">🔐</div>
          <h3 className="font-semibold text-white text-lg mb-2">
            Sign in to lock in your take
          </h3>
          <p className="text-white/50 text-sm mb-6">
            Your take is verified and ready! Sign in to claim it and track your prediction record.
          </p>

          <div className="flex flex-col gap-3">
            <SignInButton mode="modal" fallbackRedirectUrl={typeof window !== "undefined" ? window.location.href : "/"}>
              <button className="w-full px-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors">
                Sign In / Sign Up
              </button>
            </SignInButton>
            <button
              onClick={handleBack}
              className="text-white/50 text-sm hover:text-white/70 transition-colors"
            >
              Go back and edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Saving step
  if (step === "saving") {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
          <div className="animate-pulse">
            <div className="text-2xl mb-3">🔒</div>
            <p className="text-white/70">Locking in your take...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
