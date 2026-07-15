"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Wallet } from "lucide-react";
import Link from "next/link";

export function DashboardTopBar({ title }: { title: string }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setBalance(snap.data()?.creditsBalance ?? 0);
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="flex items-center justify-between px-6 md:px-8 h-16 border-b border-white/10 bg-obsidian/80 backdrop-blur-md sticky top-0 z-40">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <Link
        href="/dashboard/billing"
        className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm text-gold hover:bg-gold/10 transition-colors"
      >
        <Wallet size={16} />
        {balance === null ? "..." : `${balance.toLocaleString("fr-FR")} crédits`}
      </Link>
    </div>
  );
}
