import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeLoader } from "@/components/shared/ThemeLoader";
import { FcmRegister } from "@/components/shared/FcmRegister";
import { WatermarkClient } from "@/components/shared/WatermarkClient";

export const metadata: Metadata = {
  title: "VerzaRoute — Plateforme de routage IA multi-modèles",
  description:
    "Accédez à GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Kimi, MiniMax, Z.ai et StepFun via une seule clé API et un seul solde de crédits. Paiement Mobile Money & carte bancaire.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VerzaRoute",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-obsidian antialiased">
        <AuthProvider>
          <ThemeLoader />
          <FcmRegister />
          <WatermarkClient />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}