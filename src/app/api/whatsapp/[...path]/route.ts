import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ message: "La conexión con WhatsApp no está configurada" }, { status: 503 });
  }

  const { path } = await context.params;
  const target = `${apiUrl}/${path.join("/")}${request.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "No fue posible contactar la API de WhatsApp" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
