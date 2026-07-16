"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { UserProfile } from "@/types";
import { Check, Phone, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName);
        setPhoneNumber(data.phoneNumber ?? "");
      }
    });
    return () => unsub();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { displayName, updatedAt: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSavePhone() {
    if (!user) return;
    setPhoneError(null);
    const digitsOnly = phoneNumber.replace(/[^\d+]/g, "");
    if (!digitsOnly.startsWith("+") || digitsOnly.length < 8) {
      setPhoneError("Format attendu : indicatif pays + numéro, ex: +2250700000000");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { phoneNumber: digitsOnly, updatedAt: Date.now() });
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  }

  return (
    <>
      <div className="hidden md:block">
        <DashboardTopBar title="Profil" />
      </div>

      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gold-gradient flex items-center justify-center text-obsidian font-bold text-lg sm:text-xl shrink-0">
              {profile?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{profile?.displayName}</p>
              <p className="text-white/50 text-sm truncate">{profile?.email}</p>
            </div>
          </div>

          <label className="block text-sm text-white/70 mb-1.5">Nom affiché</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors mb-4"
          />

          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform w-full sm:w-auto"
          >
            {saved ? <Check size={16} /> : null}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1.5">
            <Phone size={16} className="text-gold" />
            <h2 className="text-white font-semibold">Numéro de téléphone</h2>
          </div>
          <p className="text-xs text-white/50 mb-4">
            Requis pour créer un paiement (Mobile Money / carte) via Verzapay. Format international
            avec indicatif pays, ex : <span className="text-white/70 font-mono">+2250700000000</span>.
          </p>

          {!profile?.phoneNumber && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 mb-4">
              <AlertTriangle size={15} className="text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-gold/90">
                Aucun numéro enregistré. Tu devras en ajouter un avant de pouvoir acheter des crédits.
              </p>
            </div>
          )}

          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+2250700000000"
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors mb-3 font-mono"
          />
          {phoneError && <p className="text-xs text-red-400 mb-3">{phoneError}</p>}

          <button
            onClick={handleSavePhone}
            className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform w-full sm:w-auto"
          >
            {phoneSaved ? <Check size={16} /> : null}
            {phoneSaved ? "Enregistré" : "Enregistrer le numéro"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <h2 className="text-white font-semibold mb-3">Compte</h2>
          <div className="space-y-1">
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-white/50">Rôle</span>
              <span className="text-white capitalize">{profile?.role}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-white/50">Membre depuis</span>
              <span className="text-white">
                {profile ? new Date(profile.createdAt).toLocaleDateString("fr-FR") : "..."}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-white/50">Solde de crédits</span>
              <span className="text-gold font-semibold">
                {profile?.creditsBalance?.toLocaleString("fr-FR")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}