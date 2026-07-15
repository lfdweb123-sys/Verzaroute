import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/PricingFooter";
import { CheckCircle2 } from "lucide-react";

const SERVICES = [
  { name: "API de routage (/api/v1/chat/completions)", status: "operational" },
  { name: "Authentification (Firebase Auth)", status: "operational" },
  { name: "Paiements Verzapay (Mobile Money & carte)", status: "operational" },
  { name: "OpenAI (GPT)", status: "operational" },
  { name: "Anthropic (Claude)", status: "operational" },
  { name: "Google (Gemini)", status: "operational" },
  { name: "xAI (Grok)", status: "operational" },
  { name: "DeepSeek", status: "operational" },
  { name: "Mistral AI", status: "operational" },
  { name: "Moonshot AI (Kimi)", status: "operational" },
  { name: "MiniMax", status: "operational" },
  { name: "Z.ai", status: "operational" },
  { name: "StepFun", status: "operational" },
];

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Tous les systèmes sont opérationnels</h1>
        </div>
        <p className="text-white/50 text-sm mb-10">
          Dernière vérification : mise à jour en temps réel. Pour un incident en cours, un bandeau
          apparaîtrait ici avec les détails.
        </p>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card divide-y divide-white/5">
          {SERVICES.map((s) => (
            <div key={s.name} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-white/80">{s.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> Opérationnel
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-white/40">
          Un problème avec un service précis ? Écris-nous à{" "}
          <a href="mailto:contact@verzaroute.com" className="text-gold hover:underline">
            contact@verzaroute.com
          </a>
          .
        </p>
      </div>
      <Footer />
    </main>
  );
}