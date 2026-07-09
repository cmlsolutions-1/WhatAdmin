export interface Sender {
  id: number;
  displayName: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  status: string;
  lastDisconnectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderStatus {
  sender: Sender;
  session: {
    status: string;
    qr: string | null;
    lastDisconnectReason: string | null;
  };
}

export async function panelRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/whatsapp/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "No se pudo completar la solicitud");
  return payload.data as T;
}
