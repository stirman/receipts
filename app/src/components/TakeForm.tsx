"use client";

import { useState } from "react";

interface TakeFormProps {
  onSubmit: (take: string) => void;
}

export function TakeForm({ onSubmit }: TakeFormProps) {
  const [take, setTake] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!take.trim()) return;

    setIsSubmitting(true);
    // Simulate API delay for now
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSubmit(take.trim());
    setTake("");
    setIsSubmitting(false);
  };

  const characterCount = take.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
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
          disabled={isSubmitting}
        />
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
            disabled={!take.trim() || isOverLimit || isSubmitting}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {isSubmitting ? "Locking..." : "Lock It In 🔒"}
          </button>
        </div>
      </div>
      <p className="text-white/30 text-xs mt-3 text-center">
        Once locked, your take cannot be edited or deleted.
      </p>
    </form>
  );
}
