"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string; // ISO string
  onComplete?: () => void;
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        onComplete?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  // If resolved (time's up)
  if (timeLeft.total <= 0) {
    return (
      <span className="text-amber-400 animate-pulse">
        ⏰ Resolving soon...
      </span>
    );
  }

  // Format based on time remaining
  if (timeLeft.days > 7) {
    // More than a week - just show date
    return null;
  }

  if (timeLeft.days > 0) {
    return (
      <span className="text-white/70">
        Resolves in {timeLeft.days}d {timeLeft.hours}h
      </span>
    );
  }

  if (timeLeft.hours > 0) {
    return (
      <span className="text-amber-400">
        ⏰ Resolves in {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  // Less than an hour - show minutes and seconds
  return (
    <span className="text-amber-400 font-mono animate-pulse">
      ⏰ {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, "0")}
    </span>
  );
}
