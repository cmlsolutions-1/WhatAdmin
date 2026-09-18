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

export class PanelRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PanelRequestError";
  }
}

export async function panelRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/whatsapp/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new PanelRequestError(payload.message || "No se pudo completar la solicitud", response.status);
  return payload.data as T;
}
