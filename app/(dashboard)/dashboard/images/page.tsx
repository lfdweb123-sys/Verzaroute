"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel } from "@/types";
import { ImagePlus, Loader2, Download, Sparkles, ChevronUp, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface GeneratedImage {
  id: string;
  base64: string;
  mimeType: string;
  prompt: string;
  size: "1024x1024" | "1024x1792" | "1792x1024";
  creditsCharged: number;
}

type SizeOption = "1024x1024" | "1024x1792" | "1792x1024";

const SIZE_LABELS: Record<SizeOption, string> = {
  "1024x1024": "Carré (1024×1024)",
  "1024x1792": "Portrait (1024×1792)",
  "1792x1024": "Paysage (1792×1024)",
};

export default function ImagesPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<SizeOption>("1024x1024");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  const galleryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    galleryRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [images]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) {
        setSizePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          size,
          creditsCharged: data.creditsCharged,
        },
        ...prev,
      ]);
      setPrompt("");
      if (textareaRef.current) textareaRef.current.style.height = "24px";
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  const currentModel = models.find((m) => m.id === selectedModel);
  const hasGenerated = images.length > 0;

  return (
    <>
      <div className="hidden md:block">
        <DashboardTopBar title="Générer une image" />
      </div>

      <div
        className={cn(
          "flex flex-col w-full transition-all duration-500 ease-in-out",
          hasGenerated ? "h-[100dvh] md:h-[calc(100vh-4rem)]" : "min-h-[100dvh] justify-center px-3 sm:px-4"
        )}
      >
        {models.length === 0 ? (
          <div className="max-w-2xl w-full mx-auto rounded-2xl border border-white/10 bg-obsidian-card p-6 text-center">
            <p className="text-white/50 text-sm">
              Aucun modèle de génération d&apos;image disponible pour le moment. Si tu es admin, vérifie
              que le catalogue a bien été mis à jour (<code className="text-gold">npx tsx scripts/seed.ts</code>).
            </p>
          </div>
        ) : (
          <>
            {hasGenerated && (
              <div
                ref={galleryRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-6 min-h-0"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden"
                    >
                      <button
                        onClick={() => setPreviewImage(img)}
                        className="relative w-full block"
                        aria-label="Agrandir l'image"
                      >
                        <img
                          src={`data:${img.mimeType};base64,${img.base64}`}
                          alt={img.prompt}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Maximize2
                            size={18}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </button>
                      <div className="p-2.5 sm:p-3">
                        <p className="text-[11px] sm:text-xs text-white/60 line-clamp-2 mb-2">{img.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] text-white/40">
                            -{img.creditsCharged} crédits
                          </span>
                          <button
                            onClick={() => handleDownload(img)}
                            className="flex items-center gap-1 text-[11px] sm:text-xs text-gold hover:underline"
                          >
                            <Download size={12} /> Télécharger
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {loading && (
                  <div className="mt-3 sm:mt-4 flex items-center gap-2 text-white/50 text-xs sm:text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Génération en cours...
                  </div>
                )}
              </div>
            )}

            {!hasGenerated && !loading && (
              <div className="max-w-2xl w-full mx-auto mb-6 text-center">
                <ImagePlus size={32} className="mx-auto mb-3 text-gold/40" />
                <p className="text-white/40 text-sm">Aucune image générée pour le moment.</p>
              </div>
            )}

            {!hasGenerated && loading && (
              <div className="max-w-2xl w-full mx-auto mb-6 flex items-center justify-center gap-2 text-white/50 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Génération en cours...
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "px-3 sm:px-4 py-2 bg-red-500/10 border-y border-red-500/20",
                  !hasGenerated && "max-w-2xl w-full mx-auto rounded-lg border mb-3"
                )}
              >
                <p className="text-xs sm:text-sm text-red-400">{error}</p>
              </div>
            )}

            <div
              className={cn(
                "w-full",
                hasGenerated
                  ? "border-t border-white/10 p-2 sm:p-3 md:p-4 bg-obsidian-card"
                  : "max-w-2xl mx-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-obsidian-card overflow-visible",
                  hasGenerated && "border-white/15"
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
                            {m.displayName} — ${m.pricePerImageUsd?.toFixed(2)}/image
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={sizePickerRef}>
                    <button
                      onClick={() => setSizePickerOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/40 hover:text-white/70 transition-colors whitespace-nowrap"
                    >
                      <span>{SIZE_LABELS[size]}</span>
                      <ChevronUp size={12} className={cn("transition-transform", sizePickerOpen && "rotate-180")} />
                    </button>

                    {sizePickerOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl border border-white/10 bg-obsidian shadow-xl z-50">
                        {(Object.keys(SIZE_LABELS) as SizeOption[]).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setSize(opt);
                              setSizePickerOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors truncate block",
                              opt === size ? "text-gold" : "text-white/80"
                            )}
                          >
                            {SIZE_LABELS[opt]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea auto-agrandissable : hauteur par défaut pour un prompt court,
                    grandit dynamiquement pour un prompt long, avec un plafond scrollable. */}
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
                    placeholder="Décris l'image que tu veux générer..."
                    rows={1}
                    className="w-full resize-none bg-transparent text-white outline-none leading-relaxed placeholder:text-white/40 text-sm sm:text-base max-h-24 sm:max-h-32 overflow-y-auto"
                    style={{ minHeight: "24px", height: "24px" }}
                  />
                </div>

                {/* Ligne du bas : indication clavier + bouton générer */}
                <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2">
                  <span className="hidden sm:inline text-[10px] text-white/30 uppercase tracking-wide">
                    Entrée pour générer · Maj + Entrée pour un retour à la ligne
                  </span>

                  <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                    {currentModel && (
                      <span className="hidden sm:inline text-[10px] text-white/40 whitespace-nowrap">
                        ~${currentModel.pricePerImageUsd?.toFixed(2)}/image
                      </span>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !prompt.trim() || !selectedModel}
                      className="shrink-0 rounded-xl bg-gold-gradient p-2 sm:p-2.5 text-obsidian hover:scale-[1.05] transition-transform disabled:opacity-40 disabled:hover:scale-100"
                      aria-label="Générer l'image"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {!hasGenerated && (
                <p className="mt-2 text-center text-[10px] sm:text-xs text-white/30">
                  Les images générées peuvent comporter des imperfections. Le coût est débité de ton solde de crédits.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={`data:${previewImage.mimeType};base64,${previewImage.base64}`}
            alt={previewImage.prompt}
            className="max-w-full max-h-full rounded-xl border border-white/10 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}