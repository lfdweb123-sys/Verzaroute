# VerzaRoute — AI Payment Routing Platform

Plateforme de routage IA multi-modèles (GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Kimi,
MiniMax, Z.ai, StepFun) avec une seule clé API, un seul solde de crédits, et un système de
paiement Mobile Money / carte bancaire via **Verzapay**, pensé pour le marché africain.

Thème visuel : **noir & or premium**, personnalisable en direct depuis le dashboard admin.

---

## 1. Stack technique

| Domaine        | Techno                                             |
|----------------|-----------------------------------------------------|
| Frontend       | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Auth           | Firebase Auth (Google `signInWithRedirect` + Email/mdp) |
| Base de données| Firebase Firestore                                  |
| Notifications  | Firebase Cloud Messaging (push web)                 |
| Paiement       | Verzapay (Mobile Money + carte)                      |
| Hébergement    | Vercel                                               |
| PWA            | manifest.json + service workers (`sw.js`, `firebase-messaging-sw.js`) |

---

## 2. Structure du projet

```
verzaroute/
├── app/
│   ├── (auth)/login, register
│   ├── (dashboard)/dashboard/...      → espace utilisateur
│   ├── (admin)/admin/...              → espace administrateur
│   └── api/
│       ├── v1/chat/completions        → PROXY multi-IA (cœur du routeur)
│       ├── v1/keys                    → CRUD clés API
│       ├── v1/billing/purchase        → création paiement Verzapay
│       ├── v1/admin/*                 → stats, users, models, payouts, settings
│       ├── v1/notifications/register-token
│       ├── webhooks/verzapay          → réception "payment.completed"
│       └── auth/session               → cookie de session + rôle
├── components/ (landing, dashboard, admin, shared)
├── lib/
│   ├── firebase/ (client.ts, admin.ts)
│   ├── providers/ (adapters par fournisseur IA)
│   ├── verzapay/client.ts
│   ├── auth/AuthContext.tsx
│   ├── apikey.ts, credits.ts, models-catalog.ts
│   └── api/requireAdmin.ts
├── scripts/ (seed.ts, setAdmin.ts, generate-sw-config.js)
├── public/ (manifest.json, sw.js, firebase-messaging-sw.js, icons/, branding/logo-source.png)
├── firestore.rules, firestore.indexes.json, firebase.json
└── middleware.ts   → redirection automatique selon le rôle
```

---

## 3. Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement et le remplir (voir section 4)
cp .env.example .env.local

# 3. Lancer en local
npm run dev
```

L'application est disponible sur http://localhost:3000

---

## 4. Configuration Firebase

1. Créez un projet sur https://console.firebase.google.com
2. Activez **Authentication** → activez les providers **Google** et **Email/Mot de passe**
3. Activez **Firestore Database** (mode production)
4. Activez **Cloud Messaging** (pour les notifications push) et générez une **clé VAPID**
   (Project Settings → Cloud Messaging → Web configuration → Generate key pair)
5. Récupérez la config Web (Project Settings → General → Vos applications → SDK config) et
   remplissez les variables `NEXT_PUBLIC_FIREBASE_*` dans `.env.local`
6. Générez une clé de compte de service (Project Settings → Service accounts → Generate new
   private key) et remplissez `FIREBASE_ADMIN_*` — **attention à bien échapper les `\n`** dans
   `FIREBASE_ADMIN_PRIVATE_KEY` si vous la collez comme variable d'environnement Vercel.
7. Déployez les règles de sécurité et les index :
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # sélectionnez votre projet
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### Initialiser les données (catalogue de modèles + réglages par défaut)

```bash
npx tsx scripts/seed.ts
```

### Créer votre premier compte administrateur

1. Inscrivez-vous normalement sur `/register` (vous serez créé avec le rôle `user`)
2. Exécutez :
   ```bash
   npx tsx scripts/setAdmin.ts votre-email@exemple.com
   ```
3. Déconnectez-vous puis reconnectez-vous : vous serez redirigé vers `/admin/dashboard`

---

## 5. Configuration Verzapay

Remplissez dans `.env.local` :
```
VERZAPAY_SECRET_KEY=...       # fourni par Verzapay, jamais exposé au frontend
VERZAPAY_WEBHOOK_SECRET=...   # secret utilisé pour vérifier la signature HMAC du webhook
VERZAPAY_BASE_URL=https://www.verzapay.com/api/v1
```

Configurez dans le tableau de bord Verzapay l'URL de webhook :
```
https://votre-domaine.com/api/webhooks/verzapay
```

Le webhook vérifie la signature (`X-Verzapay-Signature`, HMAC-SHA256 du corps brut) avant tout
traitement, et crédite le compte utilisateur de façon **idempotente** (un même `payment.id` ne
peut créditer le compte qu'une seule fois, même si Verzapay renvoie l'événement plusieurs fois).

---

## 6. Configuration des fournisseurs IA

Ajoutez vos clés dans `.env.local` — seuls les fournisseurs configurés répondront, les autres
renverront une erreur explicite si un utilisateur tente de les appeler :

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
XAI_API_KEY=
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=
MOONSHOT_API_KEY=
MINIMAX_API_KEY=
ZAI_API_KEY=
STEPFUN_API_KEY=
```

Le catalogue de modèles (prix, marge, activation) est stocké dans Firestore (`collection
models`), modifiable en temps réel depuis `/admin/models` sans redéploiement.

### Utiliser l'API VerzaRoute (compatible OpenAI)

```bash
curl https://votre-domaine.com/api/v1/chat/completions \
  -H "Authorization: Bearer vzr_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-5",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'
```

La réponse suit le format `chat.completion` standard, avec un champ additionnel
`verzaroute.credits_charged` indiquant le coût réel de l'appel.

---

## 7. PWA & notifications push

- Le `manifest.json` et les icônes (générées depuis votre logo) sont dans `public/`
- `public/sw.js` gère le cache offline (cache-first pour les assets, network-first pour les pages)
- `public/firebase-messaging-sw.js` gère les notifications push FCM ; ses valeurs
  `__NEXT_PUBLIC_FIREBASE_*__` sont injectées automatiquement au build par
  `scripts/generate-sw-config.js` (hook `prebuild`, déjà configuré dans `package.json`)
- Le composant `components/shared/FcmRegister.tsx` enregistre le token FCM de l'utilisateur
  connecté dans `users/{uid}/fcmTokens/{token}` — utilisez `adminMessaging` (voir
  `lib/firebase/admin.ts`) pour envoyer des notifications depuis vos propres scripts/Cloud
  Functions si besoin.

---

## 8. Déploiement sur Vercel

```bash
npm install -g vercel
vercel login
vercel link
```

Ajoutez toutes les variables de `.env.example` dans **Vercel → Project Settings →
Environment Variables** (Production + Preview), puis :

```bash
vercel --prod
```

### Configuration du domaine verzaroute.com (registrar amen.fr)

1. Dans Vercel : **Project → Settings → Domains → Add** → `verzaroute.com` et `www.verzaroute.com`
2. Vercel affichera les enregistrements DNS à créer. Deux options :
   - **Option A (recommandée)** : déléguez les nameservers à Vercel dans l'espace client amen.fr
     (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
   - **Option B** : gardez amen.fr comme registrar/DNS et ajoutez manuellement :
     - Un enregistrement `A` sur `@` → `76.76.21.21`
     - Un enregistrement `CNAME` sur `www` → `cname.vercel-dns.com`
3. Attendez la propagation DNS (jusqu'à 24-48h), Vercel provisionne automatiquement le
   certificat SSL une fois le domaine validé.
4. Ajoutez `verzaroute.com` comme domaine autorisé dans Firebase Auth
   (Authentication → Settings → Authorized domains).

---

## 9. Sécurité — points clés

- Les clés API (`vzr_sk_...`) ne sont **jamais stockées en clair** : seul un HMAC-SHA256
  (`lib/apikey.ts`) est conservé dans Firestore, comparé en temps constant
  (`timingSafeEqual`) pour éviter les attaques par timing.
- `VERZAPAY_SECRET_KEY`, les clés des fournisseurs IA et `FIREBASE_ADMIN_*` ne sont **jamais**
  exposées côté client (aucune variable `NEXT_PUBLIC_*` ne les contient).
- Le webhook Verzapay vérifie une signature HMAC avant tout traitement et est idempotent.
- Les règles Firestore (`firestore.rules`) interdisent toute lecture/écriture directe des
  collections sensibles (`apiKeys`, ajustements de solde, modèles, réglages) depuis le client :
  seules les API routes (via Firebase Admin SDK, qui contourne les règles) peuvent les modifier.
- Le rôle admin est stocké à la fois en **custom claims Firebase** (pour le middleware, rapide)
  et dans Firestore (`users/{uid}.role`, relu par chaque API route sensible via
  `lib/api/requireAdmin.ts` pour éviter de faire confiance à un claim potentiellement obsolète).

---

## 10. Personnalisation du thème (exigence n°10)

Depuis `/admin/settings`, l'administrateur peut modifier en direct :
- Couleur primaire (or), couleur primaire foncée, couleur de fond, couleur de surface, accent
- Les taux de conversion crédits ↔ USD ↔ FCFA et le montant minimum d'achat

Ces valeurs sont stockées dans `settings/platform` (Firestore) et appliquées **instantanément**
sur toute la plateforme via `components/shared/ThemeLoader.tsx`, qui écoute le document en temps
réel (`onSnapshot`) et met à jour les variables CSS globales (`--color-primary`, etc.) — aucun
redéploiement n'est nécessaire.

---

## 11. Fonctionnalité "utilisez vos propres modèles"

La page d'accueil met en avant deux façons d'utiliser VerzaRoute :
1. **Crédits VerzaRoute** : l'utilisateur achète des crédits via Verzapay et VerzaRoute
   route ses appels vers le fournisseur choisi, en utilisant les clés API détenues par la
   plateforme (`OPENAI_API_KEY`, etc.), avec une marge appliquée.
2. **Bring Your Own Key (BYOK)** : présenté comme axe d'évolution — la structure du proxy
   (`app/api/v1/chat/completions/route.ts`) et le registre de providers (`lib/providers/index.ts`)
   sont conçus pour accueillir facilement une variante où l'utilisateur fournit ses propres
   clés fournisseurs (stockées chiffrées par utilisateur), sans débit de crédits dans ce cas.
   C'est le prochain chantier naturel une fois le cœur de la plateforme validé en production.

---

## 12. Prochaines étapes suggérées

- Ajouter le mode streaming complet côté UI (Server-Sent Events) pour l'endpoint
  `/api/v1/chat/completions` en `stream: true` (le backend le supporte déjà).
- Implémenter le stockage chiffré des clés BYOK (`users/{uid}/providerKeys/{provider}`) avec
  un algorithme type AES-256-GCM et une clé de chiffrement dédiée côté serveur.
- Ajouter des Cloud Functions Firebase pour l'envoi de notifications push métier (ex: solde
  bas, paiement confirmé) via `adminMessaging.sendToTopic` ou `sendMulticast`.
- Ajouter des tests automatisés (Vitest/Playwright) sur le flux clé API → proxy → débit crédits.

---

**VerzaRoute** — verzaroute.com
