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
            className="mt-2 max-w-[200px] rounded-lg border border-white/10 block"
          />
        );
      }
      return (
        <span key={i} className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
          <FileText size={14} /> {block.filename ?? "Document joint"}
        </span>
      );
    });
  }

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <>
      <DashboardTopBar title="Discuter avec un modèle" />
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
        <div className="border-b border-white/10 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-white/60 shrink-0">Modèle :</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setMessages([]);
              }}
              className="flex-1 sm:flex-none rounded-lg bg-obsidian-card border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
          {currentModel && (
            <span className="text-xs text-white/40 hidden sm:inline">
              ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} par 1M tokens
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 pb-24 md:pb-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/40">
              <Bot size={40} className="mb-3 text-gold/50" />
              <p className="text-sm px-4">Commence une conversation avec {currentModel?.displayName ?? "un modèle"}.</p>
              <p className="text-xs px-4 mt-1 text-white/30">Tu peux aussi joindre une image ou un document.</p>
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
                  "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                )}
              >
                {renderMessageContent(msg.content)}
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

        {attachments.length > 0 && (
          <div className="px-3 md:px-4 pt-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative flex items-center gap-2 rounded-lg border border-white/15 bg-obsidian-card px-2.5 py-1.5">
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.file.name} className="h-6 w-6 rounded object-cover" />
                ) : (
                  <FileText size={14} className="text-gold" />
                )}
                <span className="text-xs text-white/70 max-w-[120px] truncate">{att.file.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="text-white/40 hover:text-red-400" aria-label="Retirer">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-white/10 p-3 md:p-4 flex items-end gap-2 md:gap-3 pb-20 md:pb-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl border border-white/15 p-2.5 md:p-3 text-white/60 hover:text-gold hover:border-gold/40 transition-colors"
            aria-label="Joindre un fichier"
            title="Joindre une image ou un document"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris ton message ou joins un fichier..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/15 bg-obsidian-card px-3 md:px-4 py-2.5 md:py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && attachments.length === 0) || !selectedModel}
            className="shrink-0 rounded-xl bg-gold-gradient p-2.5 md:p-3 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
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