"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { Send, Loader2, Bot, User as UserIcon, Paperclip, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string }
  | { type: "document"; base64: string; mimeType: string; filename?: string };

interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
  creditsCharged?: number;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  base64: string;
  mimeType: string;
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ChatContent() {
  const searchParams = useSearchParams();
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(searchParams.get("model") ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} fichiers par message.`);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" dépasse la taille maximale de 8 Mo.`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        const isImage = file.type.startsWith("image/");
        setAttachments((prev) => [
          ...prev,
          {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            file,
            base64,
            mimeType: file.type || "application/octet-stream",
            previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          },
        ]);
      } catch {
        setError(`Impossible de lire le fichier "${file.name}".`);
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSend() {
    if ((!input.trim() && attachments.length === 0) || !selectedModel || loading) return;

    const blocks: ContentBlock[] = [];
    if (input.trim()) blocks.push({ type: "text", text: input.trim() });
    for (const att of attachments) {
      if (att.mimeType.startsWith("image/")) {
        blocks.push({ type: "image", base64: att.base64, mimeType: att.mimeType });
      } else {
        blocks.push({ type: "document", base64: att.base64, mimeType: att.mimeType, filename: att.file.name });
      }
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: attachments.length > 0 ? blocks : input.trim(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
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

  function renderMessageContent(content: ChatMessage["content"]) {
    if (typeof content === "string") return content;
    return content.map((block, i) => {
      if (block.type === "text") return <span key={i}>{block.text}</span>;
      if (block.type === "image") {
        return (
          <img
            key={i}
            src={`data:${block.mimeType};base64,${block.base64}`}
            alt="Pièce jointe"
            className="mt-2 max-w-full h-auto rounded-lg border border-white/10 block"
          />
        );
      }
      return (
        <span key={i} className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
          <FileText size={14} className="shrink-0" /> {block.filename ?? "Document joint"}
        </span>
      );
    });
  }

  const currentModel = models.find((m) => m.id === selectedModel);
  const hasStartedConversation = messages.length > 0;

  return (
    <>
      {/* Masqué sur mobile, visible uniquement sur desktop */}
      <div className="hidden md:block">
        <DashboardTopBar title="Discuter avec un modèle" />
      </div>

      {/* Container principal - centrage dynamique */}
      <div
        className={cn(
          "flex flex-col w-full transition-all duration-500 ease-in-out",
          hasStartedConversation
            ? "h-[100dvh] md:h-[calc(100vh-4rem)]"
            : "min-h-[100dvh] justify-center px-3 sm:px-4"
        )}
      >
        {/* Sélecteur de modèle - caché quand pas de conversation */}
        {hasStartedConversation && (
          <div className="border-b border-white/10 p-2 sm:p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-obsidian-card">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <label className="text-xs sm:text-sm text-white/60 shrink-0">Modèle :</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setMessages([]);
                }}
                className="flex-1 sm:flex-none min-w-0 rounded-lg bg-obsidian border border-white/15 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white outline-none focus:border-gold/50"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            {currentModel && (
              <span className="text-[10px] sm:text-xs text-white/40 hidden sm:inline whitespace-nowrap">
                ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} / 1M tokens
              </span>
            )}
          </div>
        )}

        {/* Sélecteur de modèle - visible seulement AVANT le début de la conversation */}
        {!hasStartedConversation && (
          <div className="max-w-2xl w-full mx-auto mb-3 flex items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm text-white/60 shrink-0">Modèle :</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 min-w-0 rounded-lg bg-obsidian-card border border-white/15 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white outline-none focus:border-gold/50"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
            {currentModel && (
              <span className="text-[10px] sm:text-xs text-white/40 hidden sm:inline whitespace-nowrap shrink-0">
                ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} / 1M tokens
              </span>
            )}
          </div>
        )}

        {/* Zone de messages */}
        {hasStartedConversation && (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-6 space-y-2 sm:space-y-3 md:space-y-4 pb-4 sm:pb-4 min-h-0"
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2 sm:gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <Bot size={14} className="text-gold sm:w-4 sm:h-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] sm:max-w-[80%] rounded-2xl px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words",
                    msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                  )}
                >
                  {renderMessageContent(msg.content)}
                  {msg.creditsCharged !== undefined && (
                    <p className="mt-1 text-[9px] sm:text-[10px] opacity-50">-{msg.creditsCharged} crédits</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                    <UserIcon size={14} className="text-white/70 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Bot size={14} className="text-gold sm:w-4 sm:h-4" />
                </div>
                <div className="rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 bg-obsidian-card border border-white/10">
                  <Loader2 size={14} className="animate-spin text-white/50 sm:w-4 sm:h-4" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className={cn("px-3 sm:px-4 py-2 bg-red-500/10 border-y border-red-500/20", !hasStartedConversation && "max-w-2xl w-full mx-auto rounded-lg border mb-3")}>
            <p className="text-xs sm:text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Pièces jointes en attente */}
        {attachments.length > 0 && (
          <div
            className={cn(
              "py-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto",
              hasStartedConversation
                ? "px-2 sm:px-3 md:px-4 border-t border-white/10 bg-obsidian/50"
                : "max-w-2xl w-full mx-auto mb-3"
            )}
          >
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative flex items-center gap-1.5 sm:gap-2 rounded-lg border border-white/15 bg-obsidian-card px-2 py-1 sm:px-2.5 sm:py-1.5 shrink-0"
              >
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.file.name} className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover" />
                ) : (
                  <FileText size={14} className="text-gold shrink-0" />
                )}
                <span className="text-[10px] sm:text-xs text-white/70 max-w-[80px] sm:max-w-[120px] truncate">
                  {att.file.name}
                </span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="text-white/40 hover:text-red-400 shrink-0 p-0.5"
                  aria-label="Retirer"
                >
                  <X size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Zone de saisie - positionnement dynamique */}
        <div
          className={cn(
            "transition-all duration-500 ease-in-out w-full",
            hasStartedConversation
              ? "border-t border-white/10 p-2 sm:p-3 md:p-4 flex items-end gap-1.5 sm:gap-2 md:gap-3 bg-obsidian-card"
              : "flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Bouton + (visible seulement sans conversation) */}
          {!hasStartedConversation && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS}
              className="shrink-0 rounded-full sm:rounded-xl border border-white/15 p-2.5 sm:p-2.5 md:p-3 text-white/60 hover:text-gold hover:border-gold/40 transition-colors disabled:opacity-40"
              aria-label="Joindre un fichier"
              title="Joindre une image ou un document"
            >
              <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          )}

          {/* Input principal - design comme l'image */}
          <div
            className={cn(
              "flex items-center gap-2 sm:gap-3 rounded-2xl border transition-colors min-w-0",
              hasStartedConversation
                ? "flex-1 border-white/15 bg-obsidian px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3"
                : "flex-1 border-white/10 bg-obsidian-card px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 hover:border-white/20"
            )}
          >
            {/* Bouton + dans l'input (visible avec conversation) */}
            {hasStartedConversation && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_ATTACHMENTS}
                className="shrink-0 rounded-xl p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                aria-label="Joindre un fichier"
              >
                <Paperclip size={16} />
              </button>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasStartedConversation ? "Écris ton message..." : "Tapez / pour les compétences"}
              rows={1}
              className={cn(
                "resize-none bg-transparent text-white outline-none leading-relaxed min-w-0 w-full",
                hasStartedConversation
                  ? "flex-1 placeholder:text-white/40 text-xs sm:text-sm max-h-24 sm:max-h-32"
                  : "flex-1 placeholder:text-white/40 text-sm sm:text-base md:text-lg max-h-24"
              )}
              style={{ minHeight: "24px" }}
            />

            {/* Controls droite (visibles seulement avec conversation) */}
            {hasStartedConversation && (
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setMessages([]);
                  }}
                  className="hidden md:block rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-gold/50 cursor-pointer"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>

                {currentModel && (
                  <span className="hidden lg:inline text-xs text-white/40 px-2">Moyen</span>
                )}

                <button
                  className="hidden sm:inline-flex rounded-xl p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Entrée vocale"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <button
                  className="hidden sm:inline-flex rounded-xl p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Lecture audio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Bouton envoyer (visible seulement avec conversation) */}
            {hasStartedConversation && (
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && attachments.length === 0) || !selectedModel}
                className="shrink-0 rounded-xl bg-gold-gradient p-2 sm:p-2.5 md:p-3 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
                aria-label="Envoyer"
              >
                <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
          </div>

          {/* Bouton envoyer standalone (visible seulement sans conversation) */}
          {!hasStartedConversation && (
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && attachments.length === 0) || !selectedModel}
              className="shrink-0 rounded-full sm:rounded-xl bg-gold-gradient p-2.5 sm:p-2.5 md:p-3 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Envoyer"
            >
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          )}
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