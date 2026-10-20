import { forwardPublicPairing } from "@/lib/public-pairing-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return forwardPublicPairing(token, "GET");
}
