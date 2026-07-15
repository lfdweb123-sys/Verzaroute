"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SECTIONS = [
  { id: "quickstart", label: "Démarrage rapide" },
  { id: "auth", label: "Authentification" },
  { id: "endpoint", label: "Endpoint de chat" },
  { id: "models", label: "Modèles disponibles" },
  { id: "credits", label: "Facturation & crédits" },
  { id: "errors", label: "Gestion des erreurs" },
];

export default function DocsPage() {
  const [dark, setDark] = useState(true);

  return (
    <div className={cn(dark ? "bg-obsidian text-white" : "bg-white text-neutral-900", "min-h-screen transition-colors")}>
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-md",
          dark ? "border-white/10 bg-obsidian/85" : "border-neutral-200 bg-white/85"
        )}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={16} className={dark ? "text-white/50" : "text-neutral-400"} />
            <span className="text-lg font-extrabold">
              <span className={dark ? "text-white" : "text-neutral-900"}>Verza</span>
              <span className="gold-text">Route</span>
            </span>
            <span className={cn("ml-2 text-sm font-normal", dark ? "text-white/40" : "text-neutral-400")}>Documentation</span>
          </Link>
          <button
            onClick={() => setDark((d) => !d)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              dark ? "border-white/15 text-white/70 hover:border-gold/40" : "border-neutral-300 text-neutral-600 hover:border-gold"
            )}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* CORRECTION ICI : Balise Link correctement ouverte */}
        <nav className="hidden lg:block sticky top-24 self-start space-y-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                dark ? "text-white/60 hover:text-gold hover:bg-white/5" : "text-neutral-500 hover:text-gold hover:bg-neutral-50"
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-16 max-w-none">
          <section id="quickstart">
            <h1 className="text-3xl font-bold mb-4">Documentation VerzaRoute</h1>
            <p className={cn("leading-relaxed mb-6", dark ? "text-white/70" : "text-neutral-600")}>
              VerzaRoute expose une API compatible avec le format OpenAI <code>/chat/completions</code>.
              Si tu utilises déjà un SDK OpenAI, il te suffit de changer la base URL et la clé API pour
              router tes appels vers n&apos;importe lequel des modèles disponibles sur la plateforme.
            </p>
            <CodeBlock dark={dark}>
{`curl https://verzaroute.com/api/v1/chat/completions \\
  -H "Authorization: Bearer vzr_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-5",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'`}
            </CodeBlock>
          </section>

          <section id="auth">
            <h2 className="text-2xl font-bold mb-3">Authentification</h2>
            <p className={cn("leading-relaxed mb-4", dark ? "text-white/70" : "text-neutral-600")}>
              Chaque requête doit inclure ta clé API dans l&apos;en-tête <code>Authorization</code>, au
              format <code>Bearer vzr_sk_...</code>. Génère ta clé depuis{" "}
              <Link href="/dashboard/api-keys" className="text-gold hover:underline">
                ton dashboard → Clés API
              </Link>
              . Ta clé n&apos;est affichée qu&apos;une seule fois à sa création — conserve-la en lieu sûr.
            </p>
          </section>

          <section id="endpoint">
            <h2 className="text-2xl font-bold mb-3">Endpoint de chat</h2>
            <p className={cn("leading-relaxed mb-4", dark ? "text-white/70" : "text-neutral-600")}>
              <code>POST /api/v1/chat/completions</code> accepte les paramètres suivants :
            </p>
            <div className={cn("rounded-xl border overflow-hidden", dark ? "border-white/10" : "border-neutral-200")}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={dark ? "bg-white/5 text-white/50" : "bg-neutral-50 text-neutral-500"}>
                    <th className="text-left px-4 py-2.5 font-medium">Paramètre</th>
                    <th className="text-left px-4 py-2.5 font-medium">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", dark ? "divide-white/5" : "divide-neutral-100")}>
                  {[
                    ["model", "string", "Identifiant du modèle (voir la liste ci-dessous)"],
                    ["messages", "array", "Liste de messages {role, content}"],
                    ["temperature", "number", "Créativité de la réponse (0 à 1, défaut 0.7)"],
                    ["max_tokens", "number", "Nombre maximum de tokens générés (défaut 1024)"],
                    ["stream", "boolean", "Active la réponse en flux (SSE)"],
                  ].map(([p, t, d]) => (
                    <tr key={p}>
                      <td className="px-4 py-2.5 font-mono text-gold">{p}</td>
                      <td className={cn("px-4 py-2.5", dark ? "text-white/50" : "text-neutral-500")}>{t}</td>
                      <td className={cn("px-4 py-2.5", dark ? "text-white/70" : "text-neutral-600")}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="models">
            <h2 className="text-2xl font-bold mb-3">Modèles disponibles</h2>
            <p className={cn("leading-relaxed mb-4", dark ? "text-white/70" : "text-neutral-600")}>
              La liste complète et à jour des modèles (avec prix et description) est consultable en
              temps réel depuis{" "}
              <Link href="/dashboard/models" className="text-gold hover:underline">
                ton dashboard → Modèles
              </Link>
              . 10 fournisseurs sont supportés : OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral AI,
              Moonshot AI (Kimi), MiniMax, Z.ai et StepFun.
            </p>
          </section>

          <section id="credits">
            <h2 className="text-2xl font-bold mb-3">Facturation & crédits</h2>
            <p className={cn("leading-relaxed mb-4", dark ? "text-white/70" : "text-neutral-600")}>
              Chaque appel débite ton solde en fonction des tokens réellement consommés (entrée +
              sortie), au coût du fournisseur majoré d&apos;une marge de service. Le coût exact de
              chaque appel est renvoyé dans la réponse, champ <code>verzaroute.credits_charged</code>.
            </p>
          </section>

          <section id="errors">
            <h2 className="text-2xl font-bold mb-3">Gestion des erreurs</h2>
            <div className={cn("rounded-xl border overflow-hidden", dark ? "border-white/10" : "border-neutral-200")}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={dark ? "bg-white/5 text-white/50" : "bg-neutral-50 text-neutral-500"}>
                    <th className="text-left px-4 py-2.5 font-medium">Code</th>
                    <th className="text-left px-4 py-2.5 font-medium">Signification</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", dark ? "divide-white/5" : "divide-neutral-100")}>
                  {[
                    ["401", "Clé API manquante, invalide ou révoquée"],
                    ["400", "Paramètres manquants ou modèle inconnu/désactivé"],
                    ["402", "Solde de crédits insuffisant"],
                    ["502", "Erreur du fournisseur IA sous-jacent"],
                  ].map(([c, d]) => (
                    <tr key={c}>
                      <td className="px-4 py-2.5 font-mono text-gold">{c}</td>
                      <td className={cn("px-4 py-2.5", dark ? "text-white/70" : "text-neutral-600")}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ children, dark }: { children: string; dark: boolean }) {
  return (
    <pre
      className={cn(
        "rounded-xl border p-4 overflow-x-auto text-sm font-mono leading-relaxed",
        dark ? "border-white/10 bg-obsidian-card text-white/80" : "border-neutral-200 bg-neutral-50 text-neutral-700"
      )}
    >
      {children}
    </pre>
  );
}