"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminTopBar } from "@/components/admin/TopBar";
import type { UserProfile } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function patchUser(uid: string, action: string, value: unknown) {
    setBusyUid(uid);
    try {
      await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action, value }),
      });
      await fetchUsers();
    } finally {
      setBusyUid(null);
    }
  }

  async function handleAdjustCredits(uid: string) {
    const input = prompt("Montant à ajouter (négatif pour retirer) :", "1000");
    if (!input) return;
    const amount = Number(input);
    if (Number.isNaN(amount)) return alert("Montant invalide");
    await patchUser(uid, "adjustCredits", amount);
  }

  return (
    <>
      <AdminTopBar title="Gestion des utilisateurs" />
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 font-medium">Utilisateur</th>
                <th className="p-4 font-medium">Rôle</th>
                <th className="p-4 font-medium">Solde</th>
                <th className="p-4 font-medium">Inscrit le</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-white/40">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-white/40">Aucun utilisateur.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="border-b border-white/5 last:border-0">
                    <td className="p-4">
                      <p className="text-white">{u.displayName}</p>
                      <p className="text-white/40 text-xs">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        disabled={busyUid === u.uid}
                        onChange={(e) => patchUser(u.uid, "setRole", e.target.value)}
                        className="rounded-md bg-obsidian border border-white/15 px-2 py-1 text-white text-xs"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-gold">{u.creditsBalance?.toLocaleString("fr-FR")}</td>
                    <td className="p-4 text-white/60">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4 space-x-3">
                      <button
                        onClick={() => handleAdjustCredits(u.uid)}
                        disabled={busyUid === u.uid}
                        className="text-gold hover:underline text-xs"
                      >
                        Ajuster crédits
                      </button>
                      <button
                        onClick={() => patchUser(u.uid, "setDisabled", !u.disabled)}
                        disabled={busyUid === u.uid}
                        className={u.disabled ? "text-emerald-400 hover:underline text-xs" : "text-red-400 hover:underline text-xs"}
                      >
                        {u.disabled ? "Réactiver" : "Suspendre"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
