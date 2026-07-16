"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { Send, Loader2, Bot, User as UserIcon, Paperclip, X, FileText, Plus, Mic, Volume2, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* Header avec salutation centrée */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <h1 className="text-4xl md:text-5xl font-light text-white flex items-center gap-3 mb-12">
          <Sparkles className="w-10 h-10 text-orange-400" />
          <span>Bon après-midi, gg</span>
        </h1>

        {/* Zone de saisie principale - Design comme l'image */}
        <div className="w-full max-w-2xl">
          <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-obsidian-card px-5 py-4 hover:border-white/20 transition-colors">
            {/* Bouton + */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS}
              className="shrink-0 rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              aria-label="Joindre un fichier"
            >
              <Plus size={20} />
            </button>

            {/* Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez / pour les compétences"
              rows={1}
              className="flex-1 resize-none bg-transparent text-white placeholder:text-white/40 outline-none text-lg leading-relaxed"
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />

            {/* Controls droite */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Sélecteur modèle */}
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
                <span className="hidden md:inline text-xs text-white/40 px-2">Moyen</span>
              )}

              {/* Micro */}
              <button
                className="rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Entrée vocale"
              >
                <Mic size={18} />
              </button>

              {/* Audio */}
              <button
                className="rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Lecture audio"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>

          {/* Sélecteur mobile */}
          <div className="md:hidden mt-3 flex justify-center">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setMessages([]);
              }}
              className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white outline-none focus:border-gold/50"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zone de messages (cachée si vide, visible sinon) */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Bot size={16} className="text-gold" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                )}
              >
                {renderMessageContent(msg.content)}
                {msg.creditsCharged !== undefined && (
                  <p className="mt-1 text-[10px] opacity-50">-{msg.creditsCharged} crédits</p>
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
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-y border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Pièces jointes en attente */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-obsidian/50 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
          {attachments.map((att) => (
            <div 
              key={att.id} 
              className="relative flex items-center gap-2 rounded-lg border border-white/15 bg-obsidian-card px-2.5 py-1.5 shrink-0"
            >
              {att.previewUrl ? (
                <img src={att.previewUrl} alt={att.file.name} className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText size={14} className="text-gold shrink-0" />
              )}
              <span className="text-xs text-white/70 max-w-[120px] truncate">
                {att.file.name}
              </span>
              <button 
                onClick={() => removeAttachment(att.id)} 
                className="text-white/40 hover:text-red-400 shrink-0 p-0.5" 
                aria-label="Retirer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/50 text-sm">Chargement...</div>}>
      <ChatContent />
    </Suspense>
  );
}