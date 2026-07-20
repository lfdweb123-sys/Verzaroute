"use client";

import { X, Copy, Check, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface CodeArtifact {
  language: string;
  filename: string;
  code: string;
}

export function CodePanel({ artifact, onClose }: { artifact: CodeArtifact; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silencieux
    }
  }

  function handleDownload() {
    const blob = new Blob([artifact.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = artifact.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-[45%] max-w-2xl shrink-0 border-l border-white/10 bg-obsidian h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-md bg-gold/10 border border-gold/30 px-2 py-0.5 text-[10px] font-mono text-gold uppercase shrink-0">
            {artifact.language || "code"}
          </span>
          <span className="text-xs text-white/60 truncate">{artifact.filename}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-gold hover:bg-white/5 transition-colors"
            title="Copier"
          >
            {copied ? <Check size={14} className="text-gold" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleDownload}
            className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-gold hover:bg-white/5 transition-colors"
            title="Télécharger"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-[13px] font-mono leading-relaxed text-white/85 whitespace-pre">
        {artifact.code}
      </pre>
    </aside>
  );
}

const MIN_LINES_FOR_PANEL = 12;

export function extractLargeCodeBlock(markdown: string): { remainingText: string; artifact: CodeArtifact | null } {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const [fullMatch, language, code] = match;
    const lineCount = code.split("\n").length;
    if (lineCount >= MIN_LINES_FOR_PANEL) {
      const ext = language || "txt";
      const filename = `code.${ext}`;
      const remainingText = markdown.replace(fullMatch, `__CODE_ARTIFACT__`);
      return { remainingText, artifact: { language, filename, code: code.trimEnd() } };
    }
  }

  return { remainingText: markdown, artifact: null };
}