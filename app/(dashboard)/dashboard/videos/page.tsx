"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { HistorySidebar, type HistoryItem } from "@/components/dashboard/HistorySidebar";
import type { AiModel, VideoJob } from "@/types";
import { Film, Loader2, Sparkles, Download, AlertCircle, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const POLL_INTERVAL_MS = 5000;

export default function VideosPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const galleryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const jobRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const historyItems: HistoryItem[] = jobs.map((j) => ({
    id: j.id,
    title: j.prompt.slice(0, 50) || "Vidéo",
    subtitle: j.status === "ready" ? "Prête" : j.status === "failed" ? "Échec" : "En cours...",
  }));

  function toggleHistory() {
    setHistoryOpen((v) => !v);
  }

  function handleSelectHistoryJob(id: string) {
    jobRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleDeleteHistoryJob(id: string) {
    if (pollTimers.current[id]) clearTimeout(pollTimers.current[id]);
    try {
      await fetch(`/api/v1/dashboard-video/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      // silencieux
    }
  }

  async function handleDeleteAllHistory() {
    Object.values(pollTimers.current).forEach(clearTimeout);
    try {
      await fetch("/api/v1/dashboard-video", { method: "DELETE" });
      setJobs([]);
    } catch {
      // silencieux
    }
  }

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled && m.modality === "video");
      setModels(list);
      if (!selectedModel && list.length > 0) setSelectedModel(list[0].id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/v1/dashboard-video")
      .then((res) => res.json())
      .then((data) => {
        const loadedJobs: VideoJob[] = data.jobs ?? [];
        setJobs(loadedJobs);
        loadedJobs.forEach((j) => {
          if (j.status === "pending" || j.status === "processing") schedulePoll(j.id);
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    galleryRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [jobs.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function schedulePoll(jobId: string) {
    if (pollTimers.current[jobId]) clearTimeout(pollTimers.current[jobId]);
    pollTimers.current[jobId] = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
  }

  async function pollJob(jobId: string) {
    try {
      const res = await fetch(`/api/v1/dashboard-video/${jobId}`);
      const data = await res.json();
      if (!res.ok) return;

      const updatedJob: VideoJob = data.job;
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));

      if (updatedJob.status === "pending" || updatedJob.status === "processing") {
        schedulePoll(jobId);
      }
    } catch {
      schedulePoll(jobId);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || !selectedModel || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/dashboard-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, prompt: prompt.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      const newJob: VideoJob = data.job;
      setJobs((prev) => [newJob, ...prev]);
      setPrompt("");
      if (textareaRef.current) textareaRef.current.style.height = "24px";
      if (newJob.status === "pending" || newJob.status === "processing") {
        schedulePoll(newJob.id);
      }
    } catch {
      setError("Impossible de contacter le service. Vérifie ta connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  const currentModel = models.find((m) => m.id === selectedModel);
  const hasJobs = jobs.length > 0;

  return (
    <>
      <div className="hidden md:block">
        <DashboardTopBar title="Générer une vidéo" />
      </div>

      <div className="flex h-[100dvh] md:h-[calc(100vh-8rem)]">
        <HistorySidebar
          open={historyOpen}
          onToggle={toggleHistory}
          items={historyItems}
          onSelect={handleSelectHistoryJob}
          onDelete={handleDeleteHistoryJob}
          onDeleteAll={handleDeleteAllHistory}
          emptyLabel="Aucune vidéo générée pour le moment."
          deleteAllLabel="Supprimer tout l'historique"
        />

        <div
          className={cn(
            "flex flex-col w-full transition-all duration-500 ease-in-out min-h-0",
            hasJobs ? "h-full" : "justify-center px-3 sm:px-4"
          )}
        >
        {models.length === 0 ? (
          <div className="max-w-2xl w-full mx-auto rounded-2xl border border-white/10 bg-obsidian-card p-6 text-center">
            <p className="text-white/50 text-sm">
              Aucun modèle de génération vidéo disponible pour le moment. Si tu es admin, vérifie que
              le catalogue a bien été mis à jour (<code className="text-gold">npx tsx scripts/seed.ts</code>).
            </p>
          </div>
        ) : (
          <>
            {hasJobs && (
              <div
                ref={galleryRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-6 min-h-0"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      ref={(el) => { jobRefs.current[job.id] = el; }}
                      className="rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden"
                    >
                      <div className="aspect-video bg-black/40 flex items-center justify-center relative">
                        {job.status === "ready" && job.videoUrl ? (
                          <video src={job.videoUrl} controls className="w-full h-full object-cover" />
                        ) : job.status === "failed" ? (
                          <div className="flex flex-col items-center gap-2 text-red-400 px-4 text-center">
                            <AlertCircle size={24} />
                            <span className="text-xs">{job.errorMessage ?? "Échec de la génération"}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-white/50">
                            <Loader2 size={24} className="animate-spin text-gold" />
                            <span className="text-xs">
                              {job.status === "pending" ? "Soumission..." : "Génération en cours..."}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 sm:p-3">
                        <p className="text-[11px] sm:text-xs text-white/60 line-clamp-2 mb-2">{job.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] text-white/40">
                            {job.creditsCharged ? `-${job.creditsCharged} crédits` : "—"}
                          </span>
                          {job.status === "ready" && job.videoUrl && (
                            
                              href={job.videoUrl}
                              download
                              className="flex items-center gap-1 text-[11px] sm:text-xs text-gold hover:underline"
                            >
                              <Download size={12} /> Télécharger
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasJobs && (
              <div className="max-w-2xl w-full mx-auto mb-6 text-center">
                <Film size={32} className="mx-auto mb-3 text-gold/40" />
                <p className="text-white/40 text-sm">Aucune vidéo générée pour le moment.</p>
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "px-3 sm:px-4 py-2 bg-red-500/10 border-y border-red-500/20",
                  !hasJobs && "max-w-2xl w-full mx-auto rounded-lg border mb-3"
                )}
              >
                <p className="text-xs sm:text-sm text-red-400">{error}</p>
              </div>
            )}

            <div
              className={cn(
                "w-full",
                hasJobs ? "border-t border-white/10 p-2 sm:p-3 md:p-4 bg-obsidian-card" : "max-w-2xl mx-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-obsidian-card overflow-visible",
                  hasJobs && "border-white/15"
                )}
              >
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

                    {modelPickerOpen && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-obsidian shadow-xl z-50">
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
                            {m.displayName} — ${m.pricePerVideoSecondUsd?.toFixed(2)}/seconde
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {currentModel && (
                    <span className="text-[10px] sm:text-xs text-white/40 whitespace-nowrap">
                      ~${((currentModel.pricePerVideoSecondUsd ?? 0) * 8).toFixed(2)}$ / clip standard
                    </span>
                  )}
                </div>

                <div className="px-3 sm:px-4 pt-1">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      const el = e.target;
                      el.style.height = "24px";
                      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Décris la vidéo que tu veux générer..."
                    rows={1}
                    className="w-full resize-none bg-transparent text-white outline-none leading-relaxed placeholder:text-white/40 text-sm sm:text-base max-h-24 sm:max-h-32 overflow-y-auto"
                    style={{ minHeight: "24px", height: "24px" }}
                  />
                </div>

                <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2">
                  <span className="hidden sm:inline text-[10px] text-white/30 uppercase tracking-wide">
                    Entrée pour générer · Maj + Entrée pour un retour à la ligne
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={submitting || !prompt.trim() || !selectedModel}
                    className="ml-auto shrink-0 rounded-xl bg-gold-gradient p-2 sm:p-2.5 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
                    aria-label="Générer la vidéo"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
                </div>
              </div>

              {!hasJobs && (
                <p className="mt-2 text-center text-[10px] sm:text-xs text-white/30">
                  La génération vidéo est asynchrone et peut prendre de 30 secondes à quelques minutes.
                </p>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}