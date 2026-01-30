"use client";

import { useState } from "react";
import { Link2, Twitter, Download, Share2 } from "lucide-react";

interface ShareButtonsProps {
  takeId?: string;
}

export function ShareButtons({ takeId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharingToX, setSharingToX] = useState(false);

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

  const getImageBlob = async (): Promise<Blob | null> => {
    if (!takeId) return null;
    try {
      const response = await fetch(`/api/og/${takeId}`);
      return await response.blob();
    } catch (err) {
      console.error("Failed to fetch image:", err);
      return null;
    }
  };

  const handleShareToX = async () => {
    if (!takeId) {
      // Fallback to basic share without image
      const url = getShareUrl();
      const text = "Check out my take on Receipts 🧾";
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
      return;
    }

    setSharingToX(true);
    
    try {
      // Try native share with image first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const blob = await getImageBlob();
        if (blob) {
          const file = new File([blob], `receipt-${takeId}.png`, { type: "image/png" });
          const shareData = {
            title: "My Receipt",
            text: "Check out my take on Receipts 🧾",
            url: getShareUrl(),
            files: [file],
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setSharingToX(false);
            return;
          }
        }
      }
      
      // Fallback: Download image then open X compose
      // This copies image to clipboard on supported browsers
      const blob = await getImageBlob();
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        } catch {
          // Clipboard write not supported, continue anyway
        }
      }
      
      // Open X with text (user can paste image)
      const url = getShareUrl();
      const text = "Check out my take on Receipts 🧾 (image copied to clipboard!)";
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
    } catch (err) {
      console.error("Share failed:", err);
      // Final fallback
      const url = getShareUrl();
      const text = "Check out my take on Receipts 🧾";
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
    } finally {
      setSharingToX(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!takeId) return;
    
    setDownloading(true);
    try {
      const blob = await getImageBlob();
      if (!blob) throw new Error("Failed to get image");
      
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
    if (!navigator.share) return;
    
    try {
      // Try to share with image if supported
      if (takeId && navigator.canShare) {
        const blob = await getImageBlob();
        if (blob) {
          const file = new File([blob], `receipt-${takeId}.png`, { type: "image/png" });
          const shareData = {
            title: "My Receipt",
            text: "Check out my take on Receipts 🧾",
            url: getShareUrl(),
            files: [file],
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }
      }
      
      // Fallback to basic share
      await navigator.share({
        title: "My Receipt",
        text: "Check out my take on Receipts 🧾",
        url: getShareUrl(),
      });
    } catch (err) {
      console.log("Share cancelled or failed:", err);
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
        disabled={sharingToX}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        <Twitter className="w-4 h-4" />
        {sharingToX ? "Preparing..." : "Share to X"}
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
