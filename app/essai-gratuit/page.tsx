"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AiModel } from "@/types";
import {
  Send, Loader2, Bot, User as UserIcon, MessageSquare, ImagePlus, Film,
  ChevronUp, Lock, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ReactMarkdown from "react-markdown";

type Mode = "chat" | "image" | "video";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1.5 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[15px] font-bold mt-2 mb-1.5 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[13px] font-mono text-gold/90">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="rounded-lg bg-black/40 p-3 my-2 overflow-x-auto text-[13px] font-mono">{children}</pre>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function PublicHeader({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { user } = useAuth();

  const MODES: { id: Mode; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Discuter", icon: MessageSquare },
    { id: "image", label: "Générer une image", icon: ImagePlus },
    { id: "video", label: "Générer une vidéo", icon: Film },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-obsidian/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image src="/icons/icon-192.png" alt="VerzaRoute" width={36} height={36} className="rounded-md" priority />
        </Link>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-obsidian-card p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
                mode === id ? "bg-gold-gradient text-obsidian" : "text-white/60 hover:text-white"
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {user ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-gold-gradient px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-obsidian hover:scale-[1.03] transition-transform whitespace-nowrap"
          >
            Mon espace
          </Link>
        ) : (
          <Link
            href="/register"
            className="rounded-lg bg-gold-gradient px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-obsidian hover:scale-[1.03] transition-transform whitespace-nowrap"
          >
            Créer un compte
          </Link>
        )}
      </div>
    </header>
  );
}

function ChatMode() {
  const { user } = useAuth();
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled && (!m.modality || m.modality === "text"));
      setModels(list);
      if (!selectedModel) {
        const firstFree = list.find((m) => m.isFreeTier);
        setSelectedModel((firstFree ?? list[0])?.id ?? "");
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModel = models.find((m) => m.id === selectedModel);
  const requiresAccount = currentModel && !currentModel.isFreeTier && !user;

  async function handleSend() {
    if (!input.trim() || !selectedModel || loading) return;

    if (requiresAccount) {
      setError("Ce modèle nécessite un compte. Utilise Mistral Large ou MiniMax M2 gratuitement, ou crée un compte.");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const endpoint = user ? "/api/v1/dashboard-chat" : "/api/v1/public-chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: newMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
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

  const hasStarted = messages.length > 0;

  return (
    <div className={cn("flex flex-col w-full", hasStarted ? "h-full" : "justify-center px-3 sm:px-4 py-10")}>
      {!hasStarted && (
        <div className="max-w-2xl mx-auto w-full text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Essaie <span className="gold-text">gratuitement</span>, sans compte
          </h1>
          <p className="text-sm text-white/50">
            Mistral Large et MiniMax M2 sont gratuits pour tout le monde. Crée un compte pour débloquer
            tous les autres modèles et la génération d&apos;images/vidéos.
          </p>
        </div>
      )}

      {hasStarted && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 max-w-3xl mx-auto w-full">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2 sm:gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Bot size={15} className="text-gold" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                )}
              >
                {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                  <UserIcon size={15} className="text-white/70" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Bot size={15} className="text-gold" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-obsidian-card border border-white/10">
                <Loader2 size={16} className="animate-spin text-white/50" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={cn("px-4 py-2 bg-red-500/10 border-y border-red-500/20", !hasStarted && "max-w-2xl w-full mx-auto rounded-lg border mb-3")}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className={cn("w-full", hasStarted ? "border-t border-white/10 p-3 md:p-4 bg-obsidian-card" : "max-w-2xl mx-auto")}>
        <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-visible">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="relative" ref={modelPickerRef}>
              <button
                onClick={() => setModelPickerOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                <span className="uppercase tracking-wide">Modèle :</span>
                <span className="font-medium text-white/85">{currentModel?.displayName ?? "Sélectionner"}</span>
                {currentModel?.isFreeTier && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400">
                    Gratuit
                  </span>
                )}
                <ChevronUp size={12} className={cn("transition-transform", modelPickerOpen && "rotate-180")} />
              </button>

              {modelPickerOpen && (
                <div
                  className={cn(
                    "absolute left-0 w-64 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-obsidian shadow-xl z-50",
                    hasStarted ? "bottom-full mb-2" : "top-full mt-2"
                  )}
                >
                  {models.map((m) => {
                    const locked = !m.isFreeTier && !user;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setModelPickerOpen(false);
                          setError(null);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between gap-2",
                          m.id === selectedModel ? "text-gold" : "text-white/80"
                        )}
                      >
                        <span className="truncate">{m.displayName}</span>
                        {m.isFreeTier ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400">
                            Gratuit
                          </span>
                        ) : locked ? (
                          <Lock size={12} className="shrink-0 text-white/30" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!user && (
              <Link href="/register" className="text-[11px] text-gold hover:underline whitespace-nowrap">
                Débloquer tous les modèles →
              </Link>
            )}
          </div>

          <div className="px-4 pt-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={requiresAccount ? "Crée un compte pour utiliser ce modèle..." : "Posez n'importe quelle question..."}
              rows={1}
              disabled={!!requiresAccount}
              className="w-full resize-none bg-transparent text-white outline-none leading-relaxed placeholder:text-white/40 text-sm sm:text-base max-h-32 overflow-y-auto disabled:opacity-40"
              style={{ minHeight: "24px" }}
            />
          </div>

          <div className="flex items-center justify-end px-3 pb-3 pt-2">
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || !selectedModel || !!requiresAccount}
              className="shrink-0 rounded-xl bg-gold-gradient p-2.5 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Envoyer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>

        {!hasStarted && (
          <p className="mt-3 text-center text-xs text-white/30">
            Essai gratuit limité par jour. Crée un compte pour un accès complet et sans limite.
          </p>
        )}
      </div>
    </div>
  );
}

function LockedMode({ title, description, icon: Icon }: { title: string; description: string; icon: typeof ImagePlus }) {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
        <Icon size={32} className="text-gold/50 mb-3" />
        <p className="text-white/60 text-sm mb-4">Continue directement depuis ton tableau de bord.</p>
        <Link
          href={title.includes("image") ? "/dashboard/images" : "/dashboard/videos"}
          className="rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.03] transition-transform"
        >
          Ouvrir {title}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
      <div className="rounded-2xl border border-white/10 bg-obsidian-card p-8 max-w-md">
        <Icon size={32} className="text-gold/50 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-white/50 mb-6">{description}</p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.03] transition-transform"
        >
          <Sparkles size={16} /> Créer un compte gratuitement
        </Link>
        <p className="mt-4 text-[11px] text-white/30">
          Aucun modèle gratuit n&apos;existe pour la génération d&apos;image/vidéo — seul le chat (Mistral
          Large, MiniMax M2) est testable sans compte.
        </p>
      </div>
    </div>
  );
}

export default function EssaiGratuitPage() {
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <main className="min-h-screen bg-obsidian flex flex-col">
      <PublicHeader mode={mode} setMode={setMode} />
      <div className="flex-1 min-h-0">
        {mode === "chat" && <ChatMode />}
        {mode === "image" && (
          <LockedMode
            title="Génération d'image"
            description="Crée un compte pour accéder aux modèles de génération d'image (GPT Image 2, Gemini Flash Image, Grok Image)."
            icon={ImagePlus}
          />
        )}
        {mode === "video" && (
          <LockedMode
            title="Génération de vidéo"
            description="Crée un compte pour accéder à la génération vidéo (Veo 3.1)."
            icon={Film}
          />
        )}
      </div>
    </main>
  );
}