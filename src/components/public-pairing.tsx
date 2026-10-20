"use client";
/* eslint-disable @next/next/no-img-element -- El QR se genera como data URL local. */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Link2Off, MessageCircleMore, RefreshCw, Smartphone } from "lucide-react";
import QRCode from "qrcode";

interface PairingData {
  sender: { displayName: string; phoneLastFour: string | null };
  session: { status: string; qr: string | null; lastDisconnectReason: string | null };
  expiresAt: string;
}

type TerminalState = "completed" | "expired" | "used" | "invalid";

class PairingRequestError extends Error {
  constructor(message: string, public code: string | null) {
    super(message);
  }
}

async function pairingRequest(
  token: string,
  method: "GET" | "POST",
  signal?: AbortSignal,
): Promise<PairingData> {
  const path = `/api/public/pairing/${encodeURIComponent(token)}`;
  const response = await fetch(method === "POST" ? `${path}/connect` : path, {
    method,
    signal,
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = payload?.details?.code;
    throw new PairingRequestError(
      "No se pudo consultar la vinculación. Intenta de nuevo.",
      typeof code === "string" ? code : response.status === 404 ? "PAIRING_LINK_INVALID" : null,
    );
  }

  return payload.data as PairingData;
}

function terminalFromError(error: unknown): TerminalState | null {
  if (!(error instanceof PairingRequestError)) return null;
  switch (error.code) {
    case "PAIRING_COMPLETED": return "completed";
    case "PAIRING_LINK_EXPIRED": return "expired";
    case "PAIRING_LINK_USED": return "used";
    case "PAIRING_LINK_INVALID": return "invalid";
    default: return null;
  }
}

function isWaiting(status: string) {
  return status === "initializing" || status === "qr" || status === "reconnecting";
}

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export default function PublicPairing({ token }: { token: string }) {
  const [data, setData] = useState<PairingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [terminal, setTerminal] = useState<TerminalState | null>(null);
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState<{ value: string; image: string } | null>(null);
  const connectingRef = useRef(false);
  const shouldPoll = Boolean(data && isWaiting(data.session.status));

  useEffect(() => {
    const controller = new AbortController();
    pairingRequest(token, "GET", controller.signal)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        const nextTerminal = terminalFromError(cause);
        if (nextTerminal) setTerminal(nextTerminal);
        else setError("No se pudo cargar el enlace. Revisa tu conexión y vuelve a intentarlo.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!data || terminal || data.session.status === "connected") return;
    const remaining = Date.parse(data.expiresAt) - Date.now();
    if (!Number.isFinite(remaining)) return;
    const timer = window.setTimeout(() => setTerminal("expired"), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [data, terminal]);

  useEffect(() => {
    if (!shouldPoll || terminal) return;

    let active = true;
    let timer: number;
    const controller = new AbortController();

    async function poll() {
      try {
        const result = await pairingRequest(token, "GET", controller.signal);
        if (!active) return;
        setData(result);
        setError("");
        if (isWaiting(result.session.status)) timer = window.setTimeout(poll, 2000);
      } catch (cause) {
        if (!active) return;
        const nextTerminal = terminalFromError(cause);
        if (nextTerminal) setTerminal(nextTerminal);
        else {
          setError("No se pudo actualizar el estado. Volveremos a intentarlo.");
          timer = window.setTimeout(poll, 2000);
        }
      }
    }

    timer = window.setTimeout(poll, 2000);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [token, shouldPoll, terminal]);

  useEffect(() => {
    const qr = !terminal && data?.session.status === "qr" ? data.session.qr : null;
    if (!qr) return;
    let active = true;
    QRCode.toDataURL(qr, { width: 300, margin: 1 })
      .then((image) => { if (active) setQrImage({ value: qr, image }); })
      .catch(() => { if (active) setError("No se pudo mostrar el QR. Espera la actualización o solicita un enlace nuevo."); });
    return () => { active = false; };
  }, [data?.session.qr, data?.session.status, terminal]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await pairingRequest(token, "GET");
      setData(result);
    } catch (cause) {
      const nextTerminal = terminalFromError(cause);
      if (nextTerminal) setTerminal(nextTerminal);
      else setError("No se pudo cargar el enlace. Revisa tu conexión y vuelve a intentarlo.");
    } finally { setLoading(false); }
  }

  async function connect() {
    if (connectingRef.current || terminal || !data) return;
    connectingRef.current = true;
    setConnecting(true);
    setError("");
    const previous = data;
    setData({ ...data, session: { ...data.session, status: "initializing", qr: null } });

    try {
      const result = await pairingRequest(token, "POST");
      setData((current) => {
        if (current?.session.status === "connected" || current?.session.status === "qr") return current;
        return result;
      });
    } catch (cause) {
      const nextTerminal = terminalFromError(cause);
      if (nextTerminal) setTerminal(nextTerminal);
      else {
        setData((current) => current?.session.status === "initializing" ? previous : current);
        setError("No se pudo iniciar la conexión. Puedes intentarlo de nuevo.");
      }
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }

  const status = data?.session.status;
  const completed = terminal === "completed" || (!terminal && status === "connected");
  const canConnect = !terminal && (status === "disconnected" || status === "needs_reauth");
  const statusLabel = completed ? "Vinculada" : terminal === "expired" ? "Enlace vencido"
    : terminal === "used" ? "Enlace no disponible" : terminal === "invalid" ? "Enlace inválido"
      : status === "initializing" ? "Preparando WhatsApp…" : status === "qr" ? "Esperando escaneo"
        : status === "reconnecting" ? "Intentando reconectar…" : status === "needs_reauth" ? "Requiere vinculación"
          : status === "disconnected" ? "Sin vincular" : "Consultando…";

  return (
    <main className="pairing-page">
      <div className="pairing-shell">
        <div className="pairing-brand"><span><MessageCircleMore size={19} /></span>pulse</div>
        <section className="pairing-card" aria-live="polite">
          <div className="pairing-icon"><Smartphone size={24} /></div>
          <p className="kicker">VINCULACIÓN SEGURA</p>
          <h1>Vincular línea de WhatsApp</h1>
          <p className="pairing-intro">Conecta esta línea escaneando un código desde la aplicación de WhatsApp.</p>

          {data && <div className="pairing-details">
            <div><span>Línea</span><strong>{data.sender.displayName}</strong></div>
            <div><span>Teléfono</span><strong>•••• {data.sender.phoneLastFour || "—"}</strong></div>
            <div><span>Válido hasta</span><strong>{formatExpiry(data.expiresAt)} · Colombia</strong></div>
            <div><span>Estado</span><strong>{statusLabel}</strong></div>
          </div>}

          <div className="pairing-state">
            {loading && !data ? <><div className="loader" /><h2>Consultando enlace…</h2></>
              : completed ? <><CheckCircle2 className="pairing-result success" size={48} /><h2>Línea vinculada correctamente</h2><p>Ya puedes cerrar esta página. El administrador verá la línea conectada.</p></>
                : terminal === "expired" ? <><Clock3 className="pairing-result warning" size={46} /><h2>El enlace venció</h2><p>Solicita al administrador un enlace nuevo para continuar.</p></>
                  : terminal === "used" ? <><Link2Off className="pairing-result warning" size={46} /><h2>Este enlace ya no está disponible</h2><p>Fue utilizado o reemplazado. Solicita un enlace nuevo al administrador.</p></>
                    : terminal === "invalid" ? <><AlertCircle className="pairing-result warning" size={46} /><h2>Enlace inválido</h2><p>Verifica que copiaste el enlace completo o pide uno nuevo al administrador.</p></>
                      : status === "qr" ? <>
                        {data?.session.qr && qrImage?.value === data.session.qr
                          ? <div className="pairing-qr"><img src={qrImage.image} alt="Código QR para vincular la línea de WhatsApp" /></div>
                          : <div className="loader" />}
                        <h2>Escanea el código QR</h2>
                        <p>En tu teléfono abre WhatsApp → Dispositivos vinculados → Vincular dispositivo. Apunta la cámara a este código.</p>
                        <small>El estado se actualiza cada 2 segundos.</small>
                      </>
                        : status === "initializing" ? <><div className="loader" /><h2>Preparando WhatsApp…</h2><p>El código QR aparecerá aquí en cuanto esté listo.</p></>
                          : status === "reconnecting" ? <><RefreshCw className="pairing-result spin" size={42} /><h2>Intentando reconectar…</h2><p>Estamos comprobando la conexión de la línea.</p></>
                            : canConnect ? <><h2>La línea está lista para vincular</h2><p>Al continuar, se generará un QR para escanear desde WhatsApp.</p><button className="primary pairing-action" onClick={connect} disabled={connecting}>{connecting ? "Preparando…" : "Generar código QR"}</button></>
                              : !loading && !data ? <><AlertCircle className="pairing-result warning" size={46} /><h2>No pudimos consultar el enlace</h2><button className="secondary pairing-action" onClick={refresh}>Volver a intentar</button></>
                                : <><div className="loader" /><h2>Consultando estado…</h2></>}
            {error && !terminal && <p className="pairing-error" role="alert">{error}</p>}
          </div>
        </section>
        <p className="pairing-footnote">Este enlace es personal y temporal. No lo compartas con terceros.</p>
      </div>
    </main>
  );
}
