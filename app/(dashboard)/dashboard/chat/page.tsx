"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  creditsCharged?: number;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(searchParams.get("model") ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled);
      setModels(list);
      if (!selectedModel && list.length > 0) setSelectedModel(list[0].id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selectedModel || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/dashboard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, creditsCharged: data.creditsCharged },
      ]);
    } catch {
      setError("Impossible de contacter le modèle. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <>
      <DashboardTopBar title="Discuter avec un modèle" />
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="border-b border-white/10 p-4 flex items-center gap-3">
          <label className="text-sm text-white/60 shrink-0">Modèle :</label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setMessages([]);
            }}
            className="rounded-lg bg-obsidian-card border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          {currentModel && (
            <span className="text-xs text-white/40 hidden sm:inline">
              ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} par 1M tokens
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/40">
              <Bot size={40} className="mb-3 text-gold/50" />
              <p className="text-sm">Commence une conversation avec {currentModel?.displayName ?? "un modèle"}.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Bot size={16} className="text-gold" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                )}
              >
                {msg.content}
                {msg.creditsCharged !== undefined && (
                  <p className="mt-1.5 text-[10px] opacity-50">-{msg.creditsCharged} crédits</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                  <UserIcon size={16} className="text-white/70" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Bot size={16} className="text-gold" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-obsidian-card border border-white/10">
                <Loader2 size={16} className="animate-spin text-white/50" />
              </div>
            </div>
          )}
        </div>

        {error && <p className="px-4 md:px-6 text-sm text-red-400">{error}</p>}

        <div className="border-t border-white/10 p-4 flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris ton message... (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/15 bg-obsidian-card px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || !selectedModel}
            className="shrink-0 rounded-xl bg-gold-gradient p-3 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Envoyer"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/50 text-sm">Chargement...</div>}>
      <ChatContent />
    </Suspense>
  );
}