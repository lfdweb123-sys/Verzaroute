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
  ChevronUp, Lock, Sparkles, Copy, Check, Pencil, RotateCcw, ThumbsUp, ThumbsDown,
  Paperclip, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ReactMarkdown from "react-markdown";

type Mode = "chat" | "image" | "video";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string }
  | { type: "document"; base64: string; mimeType: string; filename?: string };

interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
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
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMessageText(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content.filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n\n");
}

/**
 * Rendu Markdown compact : marges et interlignes resserrés, taille de texte
 * légèrement réduite, pour que les réponses restent denses et lisibles sans
 * occuper un espace vertical excessif sur cette page publique. Les liens
 * s'ouvrent systématiquement dans un nouvel onglet (target="_blank").
 */
function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-[13px] font-bold mt-1 mb-0.5 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[13px] font-bold mt-1 mb-0.5 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[13px] font-bold mt-1 mb-0.5 text-white">{children}</h3>,
        p: ({ children }) => <p className="mb-1 last:mb-0 leading-tight">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0 pl-1 leading-tight">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0 pl-1 leading-tight">{children}</ol>,
        li: ({ children }) => <li className="leading-tight">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] font-mono text-gold/90">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="rounded-lg bg-black/40 p-2 my-1 overflow-x-auto text-[11px] font-mono">{children}</pre>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold underline hover:text-gold-light">
            {children}
          </a>
        ),
        hr: () => <hr className="my-1.5 border-white/10" />,
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
    <header className="shrink-0 border-b border-white/10 bg-obsidian/90 backdrop-blur-md">
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

/**
 * Mode Discuter. Architecture de hauteur : h-full transmis par le parent
 * (h-screen + overflow-hidden en cascade), seule la zone de messages défile
 * (flex-1 min-h-0 overflow-y-auto). Le champ de saisie est fixe en bas de
 * l'écran — le menu déroulant des modèles doit donc TOUJOURS s'ouvrir vers le
 * haut (bottom-full), sinon il n'a nulle part où s'afficher en dessous.
 */
function ChatMode() {
  const { user } = useAuth();
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [feedbackSentFor, setFeedbackSentFor] = useState<Record<number, "like" | "dislike">>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const hasStarted = messages.length > 0;

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

  async function sendToModel(historyMessages: ChatMessage[]) {
    setLoading(true);
    setError(null);
    try {
      const endpoint = user ? "/api/v1/dashboard-chat" : "/api/v1/public-chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: historyMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setMessages([...historyMessages, { role: "assistant", content: data.content }]);
    } catch {
      setError("Impossible de contacter le modèle. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if ((!input.trim() && attachments.length === 0) || !selectedModel || loading) return;
    if (requiresAccount) {
      setError("Ce modèle nécessite un compte. Utilise Mistral Large gratuitement, ou crée un compte.");
      return;
    }

    const blocks: ContentBlock[] = [];
    if (input.trim()) blocks.push({ type: "text", text: input.trim() });
    for (const att of attachments) {
      if (att.mimeType.startsWith("image/")) {
        blocks.push({ type: "image", base64: att.base64, mimeType: att.mimeType });
      } else {
        blocks.push({ type: "document", base64: att.base64, mimeType: att.mimeType, filename: att.file.name });
      }
    }

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: attachments.length > 0 ? blocks : input.trim() },
    ];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    await sendToModel(newMessages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingText(getMessageText(messages[index].content));
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  async function saveEdit(index: number) {
    if (!editingText.trim()) return;
    const newMessages: ChatMessage[] = [...messages.slice(0, index), { role: "user", content: editingText.trim() }];
    setMessages(newMessages);
    setEditingIndex(null);
    setEditingText("");
    await sendToModel(newMessages);
  }

  async function handleRetry(index: number) {
    if (loading) return;
    const newMessages = messages.slice(0, index + 1);
    setMessages(newMessages);
    await sendToModel(newMessages);
  }

  async function handleFeedback(index: number, type: "like" | "dislike") {
    if (!user) {
      setError("Crée un compte pour laisser un avis sur les réponses.");
      return;
    }
    try {
      await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          comment: "",
          model: selectedModel,
          userMessage: messages[index - 1] ? getMessageText(messages[index - 1].content) : "",
          assistantMessage: getMessageText(messages[index].content),
        }),
      });
      setFeedbackSentFor((prev) => ({ ...prev, [index]: type }));
    } catch {
      // silencieux : le feedback est une fonctionnalité secondaire
    }
  }

  function renderMessageContent(content: ChatMessage["content"], role: "user" | "assistant") {
    if (typeof content === "string") {
      return role === "assistant" ? <MarkdownText text={content} /> : content;
    }
    return content.map((block, i) => {
      if (block.type === "text") {
        return <span key={i}>{role === "assistant" ? <MarkdownText text={block.text} /> : block.text}</span>;
      }
      if (block.type === "image") {
        return (
          <img
            key={i}
            src={`data:${block.mimeType};base64,${block.base64}`}
            alt="Pièce jointe"
            className="mt-1.5 max-w-full h-auto rounded-lg border border-white/10 block"
          />
        );
      }
      return (
        <span key={i} className="mt-1.5 flex items-center gap-1.5 text-xs opacity-70">
          <FileText size={13} className="shrink-0" /> {block.filename ?? "Document joint"}
        </span>
      );
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!hasStarted ? (
          <div className="h-full flex flex-col items-center justify-center px-3 sm:px-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Essaie <span className="gold-text">gratuitement</span>, sans compte
            </h1>
            <p className="text-sm text-white/50 max-w-md">
              Mistral Large est gratuit pour tout le monde. Crée un compte pour débloquer tous les
              autres modèles et la génération d&apos;images/vidéos.
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="h-full overflow-y-auto p-3 md:p-6 space-y-2 max-w-2xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div key={i} className={cn("group flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn("flex gap-2 w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                      <Bot size={13} className="text-gold" />
                    </div>
                  )}

                  {msg.role === "user" && editingIndex === i ? (
                    <div className="max-w-[80%] w-full">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-xl px-3 py-2 text-sm bg-obsidian border border-gold/40 text-white outline-none focus:border-gold"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button onClick={cancelEdit} className="rounded-md px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                          Annuler
                        </button>
                        <button
                          onClick={() => saveEdit(i)}
                          disabled={!editingText.trim() || loading}
                          className="rounded-md bg-gold-gradient px-3 py-1 text-[11px] font-semibold text-obsidian disabled:opacity-40"
                        >
                          Renvoyer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-tight whitespace-pre-wrap break-words",
                        msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                      )}
                    >
                      {renderMessageContent(msg.content, msg.role)}
                    </div>
                  )}

                  {msg.role === "user" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                      <UserIcon size={13} className="text-white/70" />
                    </div>
                  )}
                </div>

                {!(msg.role === "user" && editingIndex === i) && (
                  <div className={cn("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity", msg.role === "user" ? "mr-9" : "ml-9")}>
                    <button
                      onClick={() => handleCopy(i, msg.content)}
                      className="flex items-center rounded-md px-1.5 py-1 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                      title="Copier"
                    >
                      {copiedIndex === i ? <Check size={11} className="text-gold" /> : <Copy size={11} />}
                    </button>

                    {msg.role === "user" && (
                      <>
                        <button onClick={() => startEdit(i)} className="flex items-center rounded-md px-1.5 py-1 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors" title="Modifier">
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleRetry(i)}
                          disabled={loading}
                          className="flex items-center rounded-md px-1.5 py-1 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-30"
                          title="Réessayer"
                        >
                          <RotateCcw size={11} />
                        </button>
                      </>
                    )}

                    {msg.role === "assistant" && (
                      <>
                        <button
                          onClick={() => handleFeedback(i, "like")}
                          disabled={!!feedbackSentFor[i]}
                          className={cn("flex items-center rounded-md px-1.5 py-1 transition-colors", feedbackSentFor[i] === "like" ? "text-gold" : "text-white/40 hover:text-white/80 hover:bg-white/5")}
                          title="J'aime cette réponse"
                        >
                          <ThumbsUp size={11} />
                        </button>
                        <button
                          onClick={() => handleFeedback(i, "dislike")}
                          disabled={!!feedbackSentFor[i]}
                          className={cn("flex items-center rounded-md px-1.5 py-1 transition-colors", feedbackSentFor[i] === "dislike" ? "text-red-400" : "text-white/40 hover:text-white/80 hover:bg-white/5")}
                          title="Je n'aime pas cette réponse"
                        >
                          <ThumbsDown size={11} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Bot size={13} className="text-gold" />
                </div>
                <div className="rounded-2xl px-3.5 py-2 bg-obsidian-card border border-white/10">
                  <Loader2 size={14} className="animate-spin text-white/50" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-500/10 border-y border-red-500/20">
          <p className="text-sm text-red-400 max-w-2xl mx-auto">{error}</p>
        </div>
      )}

      <div className="shrink-0 w-full max-w-2xl mx-auto px-3 sm:px-4 pb-4 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {attachments.map((att) => (
              <div key={att.id} className="relative flex items-center gap-1.5 rounded-lg border border-white/15 bg-obsidian-card px-2 py-1.5">
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.file.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText size={14} className="text-gold shrink-0" />
                )}
                <span className="text-[11px] text-white/70 max-w-[100px] truncate">{att.file.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="text-white/40 hover:text-red-400 shrink-0 p-0.5" aria-label="Retirer">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-visible">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="relative" ref={modelPickerRef}>
              <button onClick={() => setModelPickerOpen((v) => !v)} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors">
                <span className="uppercase tracking-wide">Modèle :</span>
                <span className="font-medium text-white/85">{currentModel?.displayName ?? "Sélectionner"}</span>
                {currentModel?.isFreeTier && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400">Gratuit</span>
                )}
                <ChevronUp size={12} className={cn("transition-transform", modelPickerOpen && "rotate-180")} />
              </button>

              {/* Le champ est fixe en bas de l'écran : le menu s'ouvre TOUJOURS vers le
                  haut (bottom-full), jamais vers le bas où il n'y a pas de place. */}
              {modelPickerOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-obsidian shadow-xl z-50">
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
                          <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400">Gratuit</span>
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

          <div className="flex items-center justify-between px-3 pb-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS || !!requiresAccount}
              className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              aria-label="Joindre un fichier"
              title="Joindre une image ou un document"
            >
              <Paperclip size={16} />
            </button>

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && attachments.length === 0) || !selectedModel || !!requiresAccount}
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
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
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
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
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
          Aucun modèle gratuit n&apos;existe pour la génération d&apos;image/vidéo — seul Mistral Large
          est testable sans compte, en chat.
        </p>
      </div>
    </div>
  );
}

export default function EssaiGratuitPage() {
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <main className="h-screen bg-obsidian flex flex-col overflow-hidden">
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
