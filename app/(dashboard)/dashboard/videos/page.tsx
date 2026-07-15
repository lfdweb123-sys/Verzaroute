"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel, VideoJob } from "@/types";
import { Film, Loader2, Sparkles, Download, AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 5000;

export default function VideosPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimers = useRef<Record<string, NodeJS.Timeout>>({});

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
      if (newJob.status === "pending" || newJob.status === "processing") {
        schedulePoll(newJob.id);
      }
    } catch {
      setError("Impossible de contacter le service. Vérifie ta connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <>
      <DashboardTopBar title="Générer une vidéo" />
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        {models.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6 text-center">
            <p className="text-white/50 text-sm">
              Aucun modèle de génération vidéo disponible pour le moment. Si tu es admin, vérifie que
              le catalogue a bien été mis à jour (<code className="text-gold">npx tsx scripts/seed.ts</code>).
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6 space-y-4">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-lg bg-obsidian border border-white/15 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50 w-full sm:w-auto"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} — ${m.pricePerVideoSecondUsd?.toFixed(2)}/seconde
                  </option>
                ))}
              </select>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris la vidéo que tu veux générer..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold/50 transition-colors"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={submitting || !prompt.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {submitting ? "Envoi en cours..." : "Générer la vidéo"}
              </button>
              <p className="text-xs text-white/40">
                La génération vidéo est asynchrone et peut prendre de 30 secondes à quelques minutes.
                {currentModel && ` Coût estimé : ~${((currentModel.pricePerVideoSecondUsd ?? 0) * 8).toFixed(2)}$ + marge pour un clip standard.`}
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold mb-4">Vidéos générées</h2>
              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-obsidian-card p-10 text-center">
                  <Film size={32} className="mx-auto mb-3 text-gold/40" />
                  <p className="text-white/40 text-sm">Aucune vidéo générée pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden">
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
                      <div className="p-3">
                        <p className="text-xs text-white/60 line-clamp-2 mb-2">{job.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40">
                            {job.creditsCharged ? `-${job.creditsCharged} crédits` : "—"}
                          </span>
                          {job.status === "ready" && job.videoUrl && (
                            <a
                              href={job.videoUrl}
                              download
                              className="flex items-center gap-1 text-xs text-gold hover:underline"
                            >
                              <Download size={12} /> Télécharger
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}