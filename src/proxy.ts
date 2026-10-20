import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

async function expectedToken() {
  const value = `${process.env.ADMIN_EMAIL ?? ""}:${process.env.AUTH_SECRET ?? ""}`;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const isPublicPairing =
    pathname.startsWith("/vincular-whatsapp/") ||
    pathname.startsWith("/api/public/pairing/");

  if (isPublicPairing) {
    const response = NextResponse.next();
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = Boolean(token && token === await expectedToken());

  if (!authenticated && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (authenticated && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
