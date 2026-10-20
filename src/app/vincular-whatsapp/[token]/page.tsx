import type { Metadata } from "next";
import PublicPairing from "@/components/public-pairing";

export const metadata: Metadata = {
  title: "Vincular WhatsApp | Pulse",
  robots: "noindex,nofollow",
  referrer: "no-referrer",
};

export default async function PairingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicPairing token={token} />;
}
