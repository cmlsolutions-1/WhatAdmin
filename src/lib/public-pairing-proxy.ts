import { NextResponse } from "next/server";

const PUBLIC_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function forwardPublicPairing(
  token: string,
  method: "GET" | "POST",
  connect = false,
) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return NextResponse.json(
      { message: "El enlace no es válido", details: { code: "PAIRING_LINK_INVALID" } },
      { status: 404, headers: PUBLIC_HEADERS },
    );
  }

  const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/+$/, "");
  if (!apiUrl) {
    return NextResponse.json(
      { message: "El servicio de vinculación no está disponible" },
      { status: 503, headers: PUBLIC_HEADERS },
    );
  }

  const target = `${apiUrl}/public/pairing/${encodeURIComponent(token)}${connect ? "/connect" : ""}`;

  try {
    const response = await fetch(target, {
      method,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        ...PUBLIC_HEADERS,
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "No fue posible contactar el servicio de WhatsApp" },
      { status: 502, headers: PUBLIC_HEADERS },
    );
  }
}
