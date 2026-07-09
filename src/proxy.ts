import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

async function expectedToken() {
  const value = `${process.env.ADMIN_EMAIL ?? ""}:${process.env.AUTH_SECRET ?? ""}`;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = Boolean(token && token === await expectedToken());

  if (!authenticated && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (authenticated && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
