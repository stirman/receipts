"use client";

import { useState } from "react";
import { Link2, Twitter, Download, Share2 } from "lucide-react";

interface ShareButtonsProps {
  takeId?: string;
}

export function ShareButtons({ takeId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    return window.location.href;
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

  const handleShareToX = () => {
    const url = getShareUrl();
    const text = "Check out my take on Receipts 🧾";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleDownloadImage = async () => {
    if (!takeId) return;
    
    setDownloading(true);
    try {
      // Use the OG image endpoint
      const response = await fetch(`/api/og/${takeId}`);
      const blob = await response.blob();
      
      // Create download link
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

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Receipt",
          text: "Check out my take on Receipts 🧾",
          url: getShareUrl(),
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled or failed:", err);
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && navigator.share;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
      >
        <Link2 className="w-4 h-4" />
        {copied ? "Copied!" : "Copy Link"}
      </button>

      <button
        onClick={handleShareToX}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
      >
        <Twitter className="w-4 h-4" />
        Share to X
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

      {canNativeShare && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        >
          <Share2 className="w-4 h-4" />
          More
        </button>
      )}
    </div>
  );
}
