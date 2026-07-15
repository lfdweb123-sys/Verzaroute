"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFcmMessaging } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Enregistre le service worker FCM, demande la permission de notification,
 * récupère le token push et le sauvegarde côté serveur pour cet utilisateur.
 * Ne fait rien si l'utilisateur n'est pas connecté ou si le navigateur ne supporte pas FCM.
 */
export function FcmRegister() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const messaging = await getFcmMessaging();
        if (!messaging) return;

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          await fetch("/api/v1/notifications/register-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }

        onMessage(messaging, (payload) => {
          // Notification reçue pendant que l'app est au premier plan
          if (payload.notification) {
            new Notification(payload.notification.title ?? "VerzaRoute", {
              body: payload.notification.body,
              icon: "/icons/icon-192.png",
            });
          }
        });
      } catch (err) {
        console.error("Erreur enregistrement FCM:", err);
      }
    })();
  }, [user]);

  return null;
}
