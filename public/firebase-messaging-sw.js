/**
 * Service worker dédié Firebase Cloud Messaging.
 * Reçoit les notifications push lorsque l'app est en arrière-plan ou fermée.
 * IMPORTANT : ce fichier doit rester à la racine de /public (scope "/") et être
 * accessible sur /firebase-messaging-sw.js exactement.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// Ces valeurs sont publiques (NEXT_PUBLIC_*) — remplacez-les par les vôtres après build,
// ou générez ce fichier dynamiquement via un script de build (voir scripts/generate-sw-config.js).
firebase.initializeApp({
  apiKey: "__NEXT_PUBLIC_FIREBASE_API_KEY__",
  authDomain: "__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__",
  projectId: "__NEXT_PUBLIC_FIREBASE_PROJECT_ID__",
  storageBucket: "__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__NEXT_PUBLIC_FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "VerzaRoute";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
