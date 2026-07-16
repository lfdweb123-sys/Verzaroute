"use client";

import { useState, useRef } from "react";
import { Plus, Mic, Volume2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // handleSend() logic here
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
          <span>Bon après-midi, gg</span>
        </h1>
      </div>

      {/* Input Container */}
      <div className="w-full max-w-2xl">
        <div
          className={cn(
            "relative flex items-center gap-3 rounded-2xl border bg-obsidian-card px-4 py-4 transition-all duration-300",
            isFocused 
              ? "border-gold/50 shadow-lg shadow-gold/10" 
              : "border-white/10 hover:border-white/20"
          )}
        >
          {/* Left Button */}
          <button
            className="shrink-0 rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Ajouter"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez / pour les compétences"
            rows={1}
            className="flex-1 resize-none bg-transparent text-white placeholder:text-white/40 outline-none text-base sm:text-lg leading-relaxed"
            style={{ minHeight: "24px", maxHeight: "200px" }}
          />

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Model Selector */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white font-medium">Sonnet 5</span>
              <span className="text-xs text-white/40">Moyen</span>
              <svg 
                className="w-3 h-3 text-white/40" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Voice Input */}
            <button
              className="rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Entrée vocale"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Audio Output */}
            <button
              className="rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Lecture audio"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Model Selector (visible only on small screens) */}
        <div className="sm:hidden mt-3 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-sm text-white font-medium">Sonnet 5</span>
            <span className="text-xs text-white/40">Moyen</span>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-8 text-center text-white/30 text-sm">
        <p>Appuyez sur Entrée pour envoyer • Shift + Entrée pour nouvelle ligne</p>
      </div>
    </div>
  );
}