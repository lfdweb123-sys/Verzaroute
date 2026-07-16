"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { Send, Loader2, Bot, User as UserIcon, Paperclip, X, FileText, Globe, Image as ImageIcon, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ReactMarkdown from "react-markdown";

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

/**
 * Rendu Markdown minimal pour les réponses assistant, stylé pour s'intégrer dans
 * une bulle de chat sombre (titres, gras, listes, code, liens). Utilise des classes
 * Tailwind directement sur chaque élément plutôt qu'un plugin "prose" externe, pour
 * éviter d'ajouter une dépendance CSS supplémentaire.
 */
function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1.5 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[15px] font-bold mt-2 mb-1.5 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[13px] font-mono text-gold/90">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="rounded-lg bg-black/40 p-3 my-2 overflow-x-auto text-[13px] font-mono">{children}</pre>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold underline hover:text-gold-light">
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-white/10" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gold/40 pl-3 my-2 text-white/70 italic">{children}</blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
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
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled && (!m.modality || m.modality === "text"));
      setModels(list);
      if (!selectedModel && list.length > 0) setSelectedModel(list[0].id);
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

  function getMessageText(content: ChatMessage["content"]): string {
    if (typeof content === "string") return content;
    return content
      .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n\n");
  }

  async function handleCopy(index: number, content: ChatMessage["content"]) {
    const text = getMessageText(content);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    } catch {
      setError("Impossible de copier le message.");
    }
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
    if (textareaRef.current) textareaRef.current.style.height = "24px";

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

  function renderMessageContent(content: ChatMessage["content"], role: "user" | "assistant") {
    if (typeof content === "string") {
      return role === "assistant" ? <MarkdownText text={content} /> : content;
    }
    return content.map((block, i) => {
      if (block.type === "text") {
        return (
          <span key={i}>
            {role === "assistant" ? <MarkdownText text={block.text} /> : block.text}
          </span>
        );
      }
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
      <div className="hidden md:block">
        <DashboardTopBar title="Discuter avec un modèle" />
      </div>

      <div
        className={cn(
          "flex flex-col w-full transition-all duration-500 ease-in-out",
          hasStartedConversation
            ? "h-[100dvh] md:h-[calc(100vh-4rem)]"
            : "min-h-[100dvh] justify-center px-3 sm:px-4"
        )}
      >
        {hasStartedConversation && (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-6 space-y-2 sm:space-y-3 md:space-y-4 pb-4 min-h-0"
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={cn("group flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn("flex gap-2 sm:gap-3 w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                    {renderMessageContent(msg.content, msg.role)}
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

                {/* Bouton copier disponible pour les deux rôles (utilisateur et assistant) */}
                <button
                  onClick={() => handleCopy(i, msg.content)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100",
                    msg.role === "user" ? "mr-9 sm:mr-11" : "ml-9 sm:ml-11"
                  )}
                  aria-label="Copier le message"
                  title="Copier le message"
                >
                  {copiedIndex === i ? (
                    <>
                      <Check size={12} className="text-gold" />
                      <span className="text-gold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copier</span>
                    </>
                  )}
                </button>
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

        {error && (
          <div className={cn("px-3 sm:px-4 py-2 bg-red-500/10 border-y border-red-500/20", !hasStartedConversation && "max-w-2xl w-full mx-auto rounded-lg border mb-3")}>
            <p className="text-xs sm:text-sm text-red-400">{error}</p>
          </div>
        )}

        <div
          className={cn(
            "w-full",
            hasStartedConversation
              ? "border-t border-white/10 p-2 sm:p-3 md:p-4 bg-obsidian-card"
              : "max-w-2xl mx-auto"
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

          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-obsidian-card overflow-visible",
              hasStartedConversation && "border-white/15"
            )}
          >
            {/* Ligne du haut : sélecteur de modèle + prix */}
            <div className="flex items-center justify-between px-3 sm:px-4 pt-2.5 sm:pt-3 pb-1">
              <div className="relative" ref={modelPickerRef}>
                <button
                  onClick={() => setModelPickerOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/60 hover:text-white/80 transition-colors"
                >
                  <span className="uppercase tracking-wide">Modèle :</span>
                  <span className="font-medium text-white/85">{currentModel?.displayName ?? "Sélectionner"}</span>
                  <ChevronUp size={12} className={cn("transition-transform", modelPickerOpen && "rotate-180")} />
                </button>

                {/* Dropdown ouvert VERS LE HAUT : bottom-full au lieu de top-full */}
                {modelPickerOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-obsidian shadow-xl z-50">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setModelPickerOpen(false);
                          if (hasStartedConversation) setMessages([]);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-white/5 transition-colors truncate block",
                          m.id === selectedModel ? "text-gold" : "text-white/80"
                        )}
                      >
                        {m.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {currentModel && (
                <span className="text-[10px] sm:text-xs text-white/40 whitespace-nowrap">
                  ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} / 1M tokens
                </span>
              )}
            </div>

            {/* Textarea */}
            <div className="px-3 sm:px-4 pt-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "24px";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Posez n'importe quelle question..."
                rows={1}
                className="w-full resize-none bg-transparent text-white outline-none leading-relaxed placeholder:text-white/40 text-sm sm:text-base max-h-24 sm:max-h-32 overflow-y-auto"
                style={{ minHeight: "24px", height: "24px" }}
              />
            </div>

            {/* Ligne du bas : icônes gauche + Alt+Enter + bouton envoyer */}
            <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  className="rounded-lg p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                  aria-label="Joindre un fichier"
                  title="Joindre un fichier"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  className="rounded-lg p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Recherche web"
                  title="Recherche web"
                >
                  <Globe size={16} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Joindre une image"
                  title="Joindre une image"
                >
                  <ImageIcon size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-[10px] text-white/30 uppercase tracking-wide">
                  Entrée pour envoyer · Maj + Entrée pour un retour à la ligne
                </span>
                <button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && attachments.length === 0) || !selectedModel}
                  className="shrink-0 rounded-xl bg-gold-gradient p-2 sm:p-2.5 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Envoyer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
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

          {!hasStartedConversation && (
            <p className="mt-2 text-center text-[10px] sm:text-xs text-white/30">
              Les réponses générées peuvent comporter des erreurs. Pensez à vérifier les informations importantes avant de les utiliser.
            </p>
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