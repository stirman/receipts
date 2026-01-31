"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Link2, Twitter, Download } from "lucide-react";

interface ShareButtonsProps {
  takeId?: string;
  userPosition?: "AGREE" | "DISAGREE" | null;
  takeStatus?: "PENDING" | "VERIFIED" | "WRONG";
  authorUsername?: string;
}

export function ShareButtons({ takeId, userPosition, takeStatus, authorUsername }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { user } = useUser();
  
  // Check if current user is the author
  const currentUsername = user?.username || user?.firstName || "";
  const isAuthor = currentUsername && authorUsername && 
    currentUsername.toLowerCase() === authorUsername.toLowerCase();

  // Check if user "called it" (was right) - for voters
  const userCalledIt = userPosition && takeStatus && takeStatus !== "PENDING" && (
    (userPosition === "AGREE" && takeStatus === "VERIFIED") ||
    (userPosition === "DISAGREE" && takeStatus === "WRONG")
  );

  // Check if user was wrong - for voters
  const userWasWrong = userPosition && takeStatus && takeStatus !== "PENDING" && (
    (userPosition === "AGREE" && takeStatus === "WRONG") ||
    (userPosition === "DISAGREE" && takeStatus === "VERIFIED")
  );

  // Author-specific states
  const authorWon = isAuthor && takeStatus === "VERIFIED";
  const authorLost = isAuthor && takeStatus === "WRONG";

  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin + window.location.pathname;
    // Add position to URL if user has taken a position
    if (userPosition) {
      return `${baseUrl}?position=${userPosition}`;
    }
    return baseUrl;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadImage = async () => {
    if (!takeId) return;
    
    setDownloading(true);
    try {
      // Images are now 2x by default
      const ogUrl = userPosition 
        ? `/api/og/${takeId}?position=${userPosition}`
        : `/api/og/${takeId}`;
      const response = await fetch(ogUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${takeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Get share text based on status and whether user is author
  const getShareText = () => {
    if (takeStatus === "PENDING") {
      return "Here's my hot take. Agree or disagree? 🧾";
    } else if (takeStatus === "VERIFIED") {
      return isAuthor ? "TOLD Y'ALL! 🧾👑" : "I CALLED IT 🧾👑";
    } else if (takeStatus === "WRONG") {
      return isAuthor ? "Caught an L 🧾😅" : "🤡 I was wrong on this one...";
    }
    return "Check out this take 🧾";
  };

  const handleShareToX = async () => {
    const url = getShareUrl();
    const text = getShareText();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleCalledIt = () => {
    const url = getShareUrl();
    const text = "I CALLED IT 🧾👑\n\nReceipts don't lie.";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleClownMe = () => {
    const url = getShareUrl();
    const text = "🤡 I was wrong on this one...\n\nHumble pie tastes rough.";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  // Author brag button
  const handleTellEm = () => {
    const url = getShareUrl();
    const text = "TOLD Y'ALL! 🧾👑";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  // Author L button
  const handleCaughtAnL = () => {
    const url = getShareUrl();
    const text = "Caught an L 🧾😅";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {/* Author "Tell 'em!" button - when author's take was RIGHT */}
      {authorWon && (
        <button
          onClick={handleTellEm}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg text-sm font-bold transition-colors shadow-lg hover:shadow-yellow-500/25"
        >
          👑 Tell &apos;em!
        </button>
      )}

      {/* Author "Caught an L" button - when author's take was WRONG */}
      {authorLost && (
        <button
          onClick={handleCaughtAnL}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600/70 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          😅 Caught an L
        </button>
      )}

      {/* Voter "I Called It" button - only shows when voter was RIGHT (and not author) */}
      {userCalledIt && !isAuthor && (
        <button
          onClick={handleCalledIt}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition-colors"
        >
          👑 I Called It!
        </button>
      )}

      {/* Voter "Own the L" button - only shows when voter was WRONG (and not author) */}
      {userWasWrong && !isAuthor && (
        <button
          onClick={handleClownMe}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/50 hover:bg-red-600/70 text-white rounded-lg text-sm transition-colors"
        >
          🤡 Own the L
        </button>
      )}

      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
      >
        <Link2 className="w-4 h-4" />
        {copied ? "Copied!" : "Copy Link"}
      </button>

      {takeId && (
        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Downloading..." : "Download Image"}
        </button>
      )}

      <button
        onClick={handleShareToX}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
      >
        <Twitter className="w-4 h-4" />
        Share to X
      </button>
    </div>
  );
}
