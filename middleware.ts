/**
 * Middleware de redirection selon le rôle, exécuté sur l'edge avant chaque requête.
 * - Non connecté + route protégée -> /login
 * - Connecté + tente d'accéder à /login ou /register -> redirection vers son dashboard
 * - user essayant d'accéder à /admin/* -> /dashboard
 * - admin arrivant sur /dashboard -> /admin/dashboard (l'admin utilise son propre espace)
 *
 * Le rôle est lu depuis le cookie de session Firebase, décodé JWT localement
 * (vérification légère ici ; les API routes re-vérifient toujours le cookie côté serveur avec Admin SDK).
 */
import { NextRequest, NextResponse } from "next/server";

function decodeRoleFromSessionCookie(sessionCookie: string): string | null {
  try {
    const payloadBase64 = sessionCookie.split(".")[1];
    const json = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
    return json.role ?? json.claims?.role ?? null;
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api",
  "/manifest.json",
  "/firebase-messaging-sw.js",
  "/sw.js",
  "/docs",
  "/status",
  "/privacy",
  "/terms",
  "/about",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p)));
  const sessionCookie = req.cookies.get("session")?.value;
  const role = sessionCookie ? decodeRoleFromSessionCookie(sessionCookie) : null;
  const isAuthenticated = Boolean(sessionCookie);

  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const dest = role === "admin" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (!isPublic) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/dashboard") && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};