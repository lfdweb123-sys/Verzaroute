"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { ImagePlus, Loader2, Download, Sparkles } from "lucide-react";

interface GeneratedImage {
  id: string;
  base64: string;
  mimeType: string;
  prompt: string;
  creditsCharged: number;
}

export default function ImagesPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1792" | "1792x1024">("1024x1024");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled && m.modality === "image");
      setModels(list);
      if (!selectedModel && list.length > 0) setSelectedModel(list[0].id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || !selectedModel || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/dashboard-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, prompt: prompt.trim(), size }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setImages((prev) => [
        {
          id: `${Date.now()}`,
          base64: data.base64,
          mimeType: data.mimeType,
          prompt: prompt.trim(),
          creditsCharged: data.creditsCharged,
        },
        ...prev,
      ]);
      setPrompt("");
    } catch {
      setError("Impossible de contacter le modèle. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(img: GeneratedImage) {
    const link = document.createElement("a");
    link.href = `data:${img.mimeType};base64,${img.base64}`;
    link.download = `verzaroute-${img.id}.png`;
    link.click();
  }

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <>
      <DashboardTopBar title="Générer une image" />
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        {models.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6 text-center">
            <p className="text-white/50 text-sm">
              Aucun modèle de génération d&apos;image disponible pour le moment. Si tu es admin, vérifie
              que le catalogue a bien été mis à jour (<code className="text-gold">npx tsx scripts/seed.ts</code>).
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded-lg bg-obsidian border border-white/15 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} — ${m.pricePerImageUsd?.toFixed(2)}/image
                    </option>
                  ))}
                </select>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as typeof size)}
                  className="rounded-lg bg-obsidian border border-white/15 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50"
                >
                  <option value="1024x1024">Carré (1024×1024)</option>
                  <option value="1024x1792">Portrait (1024×1792)</option>
                  <option value="1792x1024">Paysage (1792×1024)</option>
                </select>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris l'image que tu veux générer..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold/50 transition-colors"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? "Génération en cours..." : "Générer l'image"}
              </button>
              {currentModel && (
                <p className="text-xs text-white/40">
                  Coût estimé : environ {currentModel.pricePerImageUsd?.toFixed(2)}$ + marge, débité de ton solde de crédits.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-white font-semibold mb-4">Images générées</h2>
              {images.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-obsidian-card p-10 text-center">
                  <ImagePlus size={32} className="mx-auto mb-3 text-gold/40" />
                  <p className="text-white/40 text-sm">Aucune image générée pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden">
                      <img
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-3">
                        <p className="text-xs text-white/60 line-clamp-2 mb-2">{img.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40">-{img.creditsCharged} crédits</span>
                          <button
                            onClick={() => handleDownload(img)}
                            className="flex items-center gap-1 text-xs text-gold hover:underline"
                          >
                            <Download size={12} /> Télécharger
                          </button>
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