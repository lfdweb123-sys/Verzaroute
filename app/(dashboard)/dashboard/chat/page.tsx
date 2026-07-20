"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { HistorySidebar, type HistoryItem } from "@/components/dashboard/HistorySidebar";
import { CodePanel, extractLargeCodeBlock, type CodeArtifact } from "@/components/dashboard/CodePanel";
import type { AiModel } from "@/types";
import {
  Send, Loader2, Bot, User as UserIcon, Paperclip, X, FileText, Globe, Image as ImageIcon,
  ChevronUp, Copy, Check, Pencil, RotateCcw, Volume2, VolumeX, ThumbsUp, ThumbsDown, Trash2, Code2,
  Mic, MicOff, FileDown, FileType2, Download, Sparkles,
} from "lucide-react";
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
  artifact?: CodeArtifact;
  /**
   * Présent uniquement sur un message assistant issu de la génération d'image inline.
   * On ne stocke QUE l'id du document Firestore imageGenerations, jamais le base64,
   * pour éviter que le document de conversation persisté n'explose en taille
   * (limite Firestore : 1 Mo/document — plusieurs images en base64 la dépasseraient vite).
   * Le base64 réel est récupéré à l'affichage via GET /api/v1/dashboard-image/history/{id}.
   */
  imageId?: string;
  imagePrompt?: string;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  base64: string;
  mimeType: string;
}

/**
 * Détecte si un message texte ressemble à une demande de génération d'image, pour
 * router automatiquement vers la génération d'image même sans activer le bouton
 * dédié (ex: "génère-moi une image de..."). Reste volontairement permissif mais
 * ciblé sur des tournures françaises courantes — pas une détection parfaite.
 */
function looksLikeImageRequest(text: string): boolean {
  const t = text.toLowerCase();
  const hasImageWord = /(image|photo|illustration|dessin|logo|affiche|icône|icone|visuel)/.test(t);
  const hasVerb = /(g[ée]n[èe]re|dessine|cr[ée]e|fais[- ]moi|montre[- ]moi|imagine)/.test(t);
  return hasImageWord && hasVerb;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-[15px] font-bold mt-2 mb-1 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-1.5 mb-0.5 text-white">{children}</h3>,
        p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-normal">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0 pl-1 leading-normal">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0 pl-1 leading-normal">{children}</ol>,
        li: ({ children }) => <li className="leading-normal">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[12.5px] font-mono text-gold/90">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="rounded-lg bg-black/40 p-2.5 my-1.5 overflow-x-auto text-[12.5px] font-mono">{children}</pre>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold underline hover:text-gold-light">
            {children}
          </a>
        ),
        hr: () => <hr className="my-2 border-white/10" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gold/40 pl-3 my-1.5 text-white/70 italic">{children}</blockquote>
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
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<CodeArtifact | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [exportMenuIndex, setExportMenuIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [imageModeOn, setImageModeOn] = useState(false);
  const [imageModels, setImageModels] = useState<AiModel[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string>("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, { base64: string; mimeType: string }>>({});
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<HistoryItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const [feedbackPopover, setFeedbackPopover] = useState<{ index: number; type: "like" | "dislike" } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSentFor, setFeedbackSentFor] = useState<Record<number, "like" | "dislike">>({});
  const [feedbackSending, setFeedbackSending] = useState(false);

  async function loadConversationsList() {
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/v1/conversations");
      const data = await res.json();
      const items: HistoryItem[] = (data.conversations ?? []).map(
        (c: { id: string; title: string; model: string }) => ({
          id: c.id,
          title: c.title,
          subtitle: models.find((m) => m.id === c.model)?.displayName ?? c.model,
          active: c.id === activeConversationId,
        })
      );
      setConversations(items);
    } catch {
      // silencieux
    } finally {
      setConversationsLoading(false);
    }
  }

  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) loadConversationsList();
  }

  async function handleSelectConversation(id: string) {
    try {
      const res = await fetch(`/api/v1/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) return;
      const conv = data.conversation;
      setMessages(conv.messages ?? []);
      setSelectedModel(conv.model);
      setActiveConversationId(id);
      setActiveArtifact(null);
      setConversations((prev) => prev.map((c) => ({ ...c, active: c.id === id })));
    } catch {
      // silencieux
    }
  }

  function handleNewConversation() {
    setMessages([]);
    setActiveConversationId(null);
    setEditingIndex(null);
    setActiveArtifact(null);
    setConversations((prev) => prev.map((c) => ({ ...c, active: false })));
  }

  async function handleDeleteConversation(id: string) {
    try {
      await fetch(`/api/v1/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setMessages([]);
        setActiveConversationId(null);
      }
    } catch {
      // silencieux
    }
  }

  async function handleDeleteAllConversations() {
    try {
      await fetch("/api/v1/conversations", { method: "DELETE" });
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
    } catch {
      // silencieux
    }
  }

  async function persistConversation(allMessages: ChatMessage[]) {
    try {
      let convId = activeConversationId;
      if (!convId) {
        const createRes = await fetch("/api/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) return;
        convId = createData.id;
        setActiveConversationId(convId);
      }
      await fetch(`/api/v1/conversations/${convId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });
      if (historyOpen) loadConversationsList();
    } catch {
      // silencieux
    }
  }

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
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled && m.modality === "image");
      setImageModels(list);
      if (!selectedImageModel && list.length > 0) setSelectedImageModel(list[0].id);
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

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
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

  // --- Entrée vocale (micro) : API native SpeechRecognition du navigateur, aucun backend requis ---
  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("La saisie vocale n'est pas prise en charge par ce navigateur (essaie Chrome).");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  // --- Export PDF/Word d'une réponse assistant ---
  async function handleExport(index: number, format: "pdf" | "docx") {
    setExporting(true);
    setExportMenuIndex(null);
    try {
      const text = getMessageText(messages[index].content);
      const res = await fetch("/api/v1/chat-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, format, title: "Réponse VerzaRoute" }),
      });
      if (!res.ok) {
        setError("Échec de l'export du fichier.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "pdf" ? "verzaroute-reponse.pdf" : "verzaroute-reponse.docx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Impossible de générer le fichier. Réessaie plus tard.");
    } finally {
      setExporting(false);
    }
  }

  /** Génère une image inline dans la conversation, à la place d'un appel texte classique. */
  async function handleGenerateImage(promptText: string, newMessagesWithUser: ChatMessage[]) {
    if (!selectedImageModel) {
      setError("Aucun modèle de génération d'image disponible.");
      return;
    }
    setGeneratingImage(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/dashboard-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedImageModel, prompt: promptText, size: "1024x1024" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Échec de la génération d'image.");
        return;
      }

      const finalMessages: ChatMessage[] = [
        ...newMessagesWithUser,
        {
          role: "assistant",
          content: "",
          creditsCharged: data.creditsCharged,
          imageId: data.imageId,
          imagePrompt: promptText,
        },
      ];
      setMessages(finalMessages);
      if (data.imageId) {
        setImageCache((prev) => ({ ...prev, [data.imageId]: { base64: data.base64, mimeType: data.mimeType } }));
      }
      persistConversation(finalMessages);
    } catch {
      setError("Impossible de générer l'image. Vérifie ta connexion.");
    } finally {
      setGeneratingImage(false);
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

  async function sendToModel(historyMessages: ChatMessage[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/dashboard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: historyMessages.map((m) => ({ role: m.role, content: m.content })),
          webSearch: webSearchOn,
        }),
      });

      const rawText = await res.text();
      let data: { content: string; creditsCharged?: number; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("[VZR-CHAT] Réponse non-JSON reçue du serveur:", rawText.slice(0, 500));
        setError(`Réponse invalide du serveur (statut ${res.status}). Détail en console.`);
        return;
      }

      if (!res.ok) {
        console.error("[VZR-CHAT] Erreur API dashboard-chat:", res.status, data);
        setError(data.error ?? `Une erreur est survenue (statut ${res.status}).`);
        return;
      }

      if (!data.content) {
        console.error("[VZR-CHAT] Réponse OK mais champ 'content' manquant:", data);
        setError("Réponse du serveur incomplète. Détail en console.");
        return;
      }

      const { remainingText, artifact } = extractLargeCodeBlock(data.content);

      const finalMessages: ChatMessage[] = [
        ...historyMessages,
        { role: "assistant", content: remainingText, creditsCharged: data.creditsCharged, artifact: artifact ?? undefined },
      ];
      setMessages(finalMessages);
      if (artifact) setActiveArtifact(artifact);
      persistConversation(finalMessages);
    } catch (err) {
      console.error("[VZR-CHAT] Exception lors de l'appel à dashboard-chat:", err);
      setError(
        err instanceof Error
          ? `Impossible de contacter le modèle : ${err.message}`
          : "Impossible de contacter le modèle. Vérifie ta connexion."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if ((!input.trim() && attachments.length === 0) || loading || generatingImage) return;

    const trimmedInput = input.trim();
    const shouldGenerateImage = attachments.length === 0 && trimmedInput && (imageModeOn || looksLikeImageRequest(trimmedInput));

    if (shouldGenerateImage) {
      const userMessage: ChatMessage = { role: "user", content: trimmedInput };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "22px";
      await handleGenerateImage(trimmedInput, newMessages);
      return;
    }

    if (!selectedModel) return;

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
    if (textareaRef.current) textareaRef.current.style.height = "22px";

    await sendToModel(newMessages);
  }

  function startEdit(index: number) {
    const msg = messages[index];
    setEditingIndex(index);
    setEditingText(getMessageText(msg.content));
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  async function saveEdit(index: number) {
    if (!editingText.trim()) return;
    const truncated = messages.slice(0, index);
    const editedMessage: ChatMessage = { role: "user", content: editingText.trim() };
    const newMessages = [...truncated, editedMessage];
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

  function handleSpeak(index: number, content: ChatMessage["content"]) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("La lecture vocale n'est pas prise en charge par ce navigateur.");
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const text = getMessageText(content);
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  function openFeedback(index: number, type: "like" | "dislike") {
    setFeedbackPopover({ index, type });
    setFeedbackComment("");
  }

  function closeFeedback() {
    setFeedbackPopover(null);
    setFeedbackComment("");
  }

  async function submitFeedback() {
    if (!feedbackPopover) return;
    const { index, type } = feedbackPopover;
    const assistantMsg = messages[index];
    const userMsg = messages[index - 1];
    setFeedbackSending(true);
    try {
      await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          comment: feedbackComment.trim(),
          model: selectedModel,
          userMessage: userMsg ? getMessageText(userMsg.content) : "",
          assistantMessage: getMessageText(assistantMsg.content),
        }),
      });
      setFeedbackSentFor((prev) => ({ ...prev, [index]: type }));
      closeFeedback();
    } catch {
      setError("Impossible d'envoyer le retour. Réessaie plus tard.");
    } finally {
      setFeedbackSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /** Charge (si besoin) et affiche une image inline référencée par son id Firestore. */
  function InlineImage({ imageId, prompt }: { imageId: string; prompt?: string }) {
    const cached = imageCache[imageId];
    const [loadingImg, setLoadingImg] = useState(!cached);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
      if (cached) return;
      let cancelled = false;
      fetch(`/api/v1/dashboard-image/history/${imageId}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (!data.base64) {
            setImgError(true);
            return;
          }
          setImageCache((prev) => ({ ...prev, [imageId]: { base64: data.base64, mimeType: data.mimeType } }));
        })
        .catch(() => !cancelled && setImgError(true))
        .finally(() => !cancelled && setLoadingImg(false));
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageId, cached]);

    if (imgError) {
      return <p className="text-xs text-red-400">Image introuvable (peut-être supprimée depuis l&apos;historique).</p>;
    }
    if (loadingImg || !cached) {
      return (
        <div className="flex items-center gap-2 text-white/50 text-xs py-4">
          <Loader2 size={14} className="animate-spin" /> Chargement de l&apos;image...
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <img
          src={`data:${cached.mimeType};base64,${cached.base64}`}
          alt={prompt ?? "Image générée"}
          className="max-w-full h-auto rounded-lg border border-white/10 block"
        />
        
          href={`data:${cached.mimeType};base64,${cached.base64}`}
          download="verzaroute-image.png"
          className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline"
        >
          <Download size={11} /> Télécharger
        </a>
      </div>
    );
  }

  function renderMessageContent(content: ChatMessage["content"], role: "user" | "assistant", artifact?: CodeArtifact, imageId?: string, imagePrompt?: string) {
    if (imageId) {
      return <InlineImage imageId={imageId} prompt={imagePrompt} />;
    }

    const text = typeof content === "string" ? content : null;

    if (text !== null) {
      if (role === "assistant") {
        if (text.includes("__CODE_ARTIFACT__") && artifact) {
          const parts = text.split("__CODE_ARTIFACT__");
          return (
            <>
              {parts[0] && <MarkdownText text={parts[0]} />}
              <button
                onClick={() => setActiveArtifact(artifact)}
                className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 my-1.5 hover:bg-gold/10 transition-colors w-full text-left"
              >
                <Code2 size={15} className="text-gold shrink-0" />
                <span className="text-xs text-white/80 truncate">{artifact.filename}</span>
                <span className="text-[10px] text-white/40 ml-auto shrink-0">
                  {artifact.code.split("\n").length} lignes
                </span>
              </button>
              {parts[1] && <MarkdownText text={parts[1]} />}
            </>
          );
        }
        return <MarkdownText text={text} />;
      }
      return text;
    }

    return (content as ContentBlock[]).map((block, i) => {
      if (block.type === "text") {
        return <span key={i}>{role === "assistant" ? <MarkdownText text={block.text} /> : block.text}</span>;
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

      <div className="flex h-[100dvh] md:h-[calc(100vh-8rem)]">
        <HistorySidebar
          open={historyOpen}
          onToggle={toggleHistory}
          items={conversations}
          loading={conversationsLoading}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onDeleteAll={handleDeleteAllConversations}
          newLabel="Nouvelle conversation"
          emptyLabel="Aucune conversation pour le moment."
          deleteAllLabel="Supprimer toutes les discussions"
        />

        <div
          className={cn(
            "flex flex-col flex-1 min-w-0 transition-all duration-500 ease-in-out min-h-0",
            hasStartedConversation ? "h-full" : "justify-center px-3 sm:px-4"
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

                  {msg.role === "user" && editingIndex === i ? (
                    <div className="max-w-[85%] sm:max-w-[80%] w-full">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-2xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm bg-obsidian border border-gold/40 text-white outline-none focus:border-gold"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button
                          onClick={cancelEdit}
                          className="rounded-md px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => saveEdit(i)}
                          disabled={!editingText.trim() || loading}
                          className="rounded-md bg-gold-gradient px-3 py-1 text-[11px] font-semibold text-obsidian disabled:opacity-40"
                        >
                          Enregistrer et renvoyer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm leading-normal whitespace-pre-wrap break-words",
                        msg.role === "user" ? "bg-gold-gradient text-obsidian font-medium" : "bg-obsidian-card border border-white/10 text-white/85"
                      )}
                    >
                      <button
                        onClick={() => handleCopy(i, msg.content)}
                        className={cn(
                          "absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                          msg.role === "user" ? "text-obsidian/50 hover:text-obsidian hover:bg-black/10" : "text-white/40 hover:text-gold hover:bg-white/5"
                        )}
                        title="Copier"
                      >
                        {copiedIndex === i ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      {renderMessageContent(msg.content, msg.role, msg.artifact, msg.imageId, msg.imagePrompt)}
                      {msg.creditsCharged !== undefined && (
                        <p className="mt-1 text-[9px] sm:text-[10px] opacity-50">-{msg.creditsCharged} crédits</p>
                      )}
                    </div>
                  )}

                  {msg.role === "user" && (
                    <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                      <UserIcon size={14} className="text-white/70 sm:w-4 sm:h-4" />
                    </div>
                  )}
                </div>

                {!(msg.role === "user" && editingIndex === i) && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all",
                      msg.role === "user" ? "mr-9 sm:mr-11" : "ml-9 sm:ml-11"
                    )}
                  >
                    {msg.role === "user" && (
                      <>
                        <button
                          onClick={() => startEdit(i)}
                          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                          title="Modifier ce message"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleRetry(i)}
                          disabled={loading}
                          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-30"
                          title="Réessayer l'envoi"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </>
                    )}

                    {msg.role === "assistant" && (
                      <>
                        <button
                          onClick={() => handleSpeak(i, msg.content)}
                          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                          title={speakingIndex === i ? "Arrêter la lecture" : "Lire à voix haute"}
                        >
                          {speakingIndex === i ? <VolumeX size={12} className="text-gold" /> : <Volume2 size={12} />}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setExportMenuIndex(exportMenuIndex === i ? null : i)}
                            disabled={exporting}
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-40"
                            title="Exporter en PDF ou Word"
                          >
                            <FileDown size={12} />
                          </button>
                          {exportMenuIndex === i && (
                            <div className="absolute left-0 top-full mt-1 w-32 rounded-lg border border-white/10 bg-obsidian shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => handleExport(i, "pdf")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/80 hover:bg-white/5 transition-colors"
                              >
                                <FileDown size={12} className="text-gold" /> PDF
                              </button>
                              <button
                                onClick={() => handleExport(i, "docx")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/80 hover:bg-white/5 transition-colors"
                              >
                                <FileType2 size={12} className="text-gold" /> Word
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openFeedback(i, "like")}
                          disabled={!!feedbackSentFor[i]}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors",
                            feedbackSentFor[i] === "like" ? "text-gold" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                          )}
                          title="J'aime cette réponse"
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => openFeedback(i, "dislike")}
                          disabled={!!feedbackSentFor[i]}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors",
                            feedbackSentFor[i] === "dislike" ? "text-red-400" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                          )}
                          title="Je n'aime pas cette réponse"
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {feedbackPopover?.index === i && (
                  <div
                    className={cn(
                      "w-full max-w-sm rounded-xl border border-white/10 bg-obsidian-card p-3 mt-1",
                      msg.role === "user" ? "mr-9 sm:mr-11" : "ml-9 sm:ml-11"
                    )}
                  >
                    <p className="text-[11px] text-white/60 mb-2">
                      {feedbackPopover.type === "like"
                        ? "Qu'as-tu aimé dans cette réponse ? (optionnel)"
                        : "Qu'est-ce qui n'allait pas ? Ton retour est envoyé à notre équipe."}
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={2}
                      placeholder="Ton commentaire..."
                      className="w-full resize-none rounded-lg bg-obsidian border border-white/15 px-2.5 py-2 text-xs text-white outline-none focus:border-gold/50"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={closeFeedback}
                        className="rounded-md px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={submitFeedback}
                        disabled={feedbackSending}
                        className="rounded-md bg-gold-gradient px-3 py-1 text-[11px] font-semibold text-obsidian disabled:opacity-50"
                      >
                        {feedbackSending ? "Envoi..." : "Envoyer"}
                      </button>
                    </div>
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

            {generatingImage && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Sparkles size={14} className="text-gold sm:w-4 sm:h-4" />
                </div>
                <div className="rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 bg-obsidian-card border border-white/10 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-white/50" />
                  <span className="text-xs text-white/50">Génération de l&apos;image...</span>
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
              ? "border-t border-white/10 p-2 sm:p-3 bg-obsidian-card"
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
            <div className="flex items-center justify-between px-3 sm:px-4 pt-2 pb-0.5">
              <div className="relative" ref={modelPickerRef}>
                <button
                  onClick={() => setModelPickerOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/60 hover:text-white/80 transition-colors"
                >
                  <span className="uppercase tracking-wide">Modèle :</span>
                  <span className="font-medium text-white/85">{currentModel?.displayName ?? "Sélectionner"}</span>
                  <ChevronUp size={12} className={cn("transition-transform", modelPickerOpen && "rotate-180")} />
                </button>

                {modelPickerOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-obsidian shadow-xl z-50">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setModelPickerOpen(false);
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

              <div className="flex items-center gap-2">
                {hasStartedConversation && (
                  <button
                    onClick={() => activeConversationId && handleDeleteConversation(activeConversationId)}
                    disabled={!activeConversationId}
                    className="flex items-center gap-1 text-[10px] sm:text-xs text-white/30 hover:text-red-400 transition-colors disabled:opacity-30"
                    title="Supprimer cette discussion"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {currentModel && (
                  <span className="text-[10px] sm:text-xs text-white/40 whitespace-nowrap">
                    ${currentModel.inputPricePerMTokUsd.toFixed(2)} / ${currentModel.outputPricePerMTokUsd.toFixed(2)} / 1M tokens
                  </span>
                )}
              </div>
            </div>

            <div className="px-3 sm:px-4 pt-0.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "22px";
                  el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Posez n'importe quelle question..."
                rows={1}
                className="w-full resize-none bg-transparent text-white outline-none leading-snug placeholder:text-white/40 text-sm sm:text-base max-h-24 overflow-y-auto"
                style={{ minHeight: "22px", height: "22px" }}
              />
            </div>

            <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2 pt-1">
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
                  onClick={() => setWebSearchOn((v) => !v)}
                  className={cn(
                    "rounded-lg p-1.5 sm:p-2 transition-colors",
                    webSearchOn ? "text-gold bg-gold/10" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  aria-label="Recherche web"
                  title={webSearchOn ? "Recherche web activée" : "Activer la recherche web"}
                >
                  <Globe size={16} />
                </button>
                <button
                  onClick={toggleListening}
                  className={cn(
                    "rounded-lg p-1.5 sm:p-2 transition-colors",
                    isListening ? "text-red-400 bg-red-500/10 animate-pulse" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  aria-label="Saisie vocale"
                  title={isListening ? "Écoute en cours... (clique pour arrêter)" : "Dicter le message"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Joindre une image"
                  title="Joindre une image"
                >
                  <ImageIcon size={16} />
                </button>
                <button
                  onClick={() => setImageModeOn((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium transition-colors",
                    imageModeOn ? "text-gold bg-gold/10" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  aria-label="Mode génération d'image"
                  title={imageModeOn ? "Mode image activé — le prochain envoi génère une image" : "Activer le mode génération d'image"}
                >
                  <Sparkles size={16} />
                  <span className="hidden sm:inline">Image</span>
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-[10px] text-white/30 uppercase tracking-wide">
                  Entrée pour envoyer · Maj + Entrée pour un retour à la ligne
                </span>
                <button
                  onClick={handleSend}
                  disabled={loading || generatingImage || (!input.trim() && attachments.length === 0)}
                  className="shrink-0 rounded-xl bg-gold-gradient p-2 sm:p-2.5 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Envoyer"
                >
                  {loading || generatingImage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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

        {activeArtifact && <CodePanel artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />}
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