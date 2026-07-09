"use client";
/* eslint-disable @next/next/no-img-element -- El QR se genera como data URL en el navegador. */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LogOut, MessageCircleMore, Plus, RefreshCw, Send, Smartphone, Unplug, X } from "lucide-react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { panelRequest, Sender, SenderStatus } from "@/lib/whatsapp";

const labels: Record<string, string> = {
  connected: "Conectada",
  disconnected: "Desconectada",
  initializing: "Iniciando",
  qr: "Esperando QR",
};

export default function Dashboard() {
  const router = useRouter();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [connection, setConnection] = useState<SenderStatus | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadSenders = useCallback(async () => {
    setError("");
    try { setSenders(await panelRequest<Sender[]>("senders")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar las líneas"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadSenders, 0);
    return () => window.clearTimeout(timer);
  }, [loadSenders]);

  useEffect(() => {
    if (!connection || !["initializing", "qr"].includes(connection.session.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const status = await panelRequest<SenderStatus>(`senders/${connection.sender.id}/status`);
        setConnection(status);
        if (status.session.qr) setQrImage(await QRCode.toDataURL(status.session.qr, { width: 300, margin: 1 }));
        if (status.session.status === "connected") {
          setNotice("La línea quedó conectada");
          loadSenders();
        }
      } catch { /* El próximo ciclo vuelve a intentarlo. */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [connection, loadSenders]);

  async function connect(sender: Sender) {
    setBusy(true);
    setQrImage("");
    try {
      await panelRequest(`senders/${sender.id}/connect`, { method: "POST" });
      const status = await panelRequest<SenderStatus>(`senders/${sender.id}/status`);
      setConnection(status);
      if (status.session.qr) setQrImage(await QRCode.toDataURL(status.session.qr, { width: 300, margin: 1 }));
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo iniciar la conexión"); }
    finally { setBusy(false); }
  }

  async function disconnect(sender: Sender) {
    if (!window.confirm(`¿Desconectar la línea “${sender.displayName}”?`)) return;
    try {
      await panelRequest(`senders/${sender.id}/disconnect`);
      setNotice("Línea desconectada");
      loadSenders();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo desconectar"); }
  }

  async function createSender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await panelRequest("senders", {
        method: "POST",
        body: JSON.stringify({ displayName: form.get("displayName"), phoneNumber: form.get("phoneNumber") }),
      });
      setCreateOpen(false);
      setNotice("Emisor registrado");
      loadSenders();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo registrar"); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await panelRequest("notifications/send", {
        method: "POST",
        body: JSON.stringify({
          fromPhoneNumber: form.get("fromPhoneNumber"),
          toPhoneNumber: form.get("toPhoneNumber"),
          message: form.get("message"),
        }),
      });
      setSendOpen(false);
      setNotice("Notificación enviada");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo enviar"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const connected = senders.filter((sender) => sender.status === "connected").length;

  return (
    <main className="dashboard">
      <header>
        <div className="brand"><span><MessageCircleMore /></span>pulse</div>
        <div className="header-right"><span className="environment"><i /> API WhatsApp</span><button className="ghost" onClick={logout}><LogOut size={16} />Salir</button></div>
      </header>

      <div className="page">
        <section className="page-heading">
          <div><p className="kicker">ADMINISTRACIÓN</p><h1>Conexiones de WhatsApp</h1><p>Registra emisores, genera códigos QR y supervisa las sesiones activas.</p></div>
          <div className="heading-actions"><button className="secondary" onClick={() => setSendOpen(true)} disabled={!connected}><Send size={16} />Probar envío</button><button className="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Nueva línea</button></div>
        </section>

        <section className="summary">
          <div><span>Total de líneas</span><strong>{loading ? "—" : senders.length}</strong></div>
          <div><span>Conectadas</span><strong className="green">{loading ? "—" : connected}</strong></div>
          <div><span>Requieren atención</span><strong className="amber">{loading ? "—" : senders.length - connected}</strong></div>
          <button className="refresh" onClick={loadSenders}><RefreshCw size={16} />Actualizar</button>
        </section>

        {error ? <section className="state-card error-state"><AlertCircle /><div><strong>No pudimos consultar la API</strong><p>{error}</p></div><button onClick={loadSenders}>Reintentar</button></section>
        : loading ? <section className="state-card"><RefreshCw className="spin" /><p>Consultando emisores…</p></section>
        : senders.length === 0 ? <section className="empty-state"><div><Smartphone /></div><h2>Aún no hay líneas registradas</h2><p>Agrega el primer número emisor para iniciar su conexión.</p><button className="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Registrar línea</button></section>
        : <section className="sender-grid">
          {senders.map((sender) => (
            <article className="sender-card" key={sender.id}>
              <div className="sender-top"><div className="phone-box"><Smartphone size={21} /></div><span className={`badge ${sender.status}`}>{labels[sender.status] ?? sender.status}</span></div>
              <h2>{sender.displayName || "Línea sin nombre"}</h2>
              <p className="phone-number">{sender.phoneNumber}</p>
              {sender.lastDisconnectReason && <p className="reason"><AlertCircle size={13} />{sender.lastDisconnectReason}</p>}
              <div className="card-footer">
                <button className="connect" onClick={() => connect(sender)} disabled={busy}>{sender.status === "connected" ? "Ver estado" : "Conectar"}</button>
                {sender.status === "connected" && <button className="danger-icon" title="Desconectar" onClick={() => disconnect(sender)}><Unplug size={16} /></button>}
              </div>
            </article>
          ))}
        </section>}
      </div>

      {createOpen && <Modal close={() => setCreateOpen(false)} title="Registrar nueva línea" description="Agrega un número emisor a la API de WhatsApp.">
        <form onSubmit={createSender} className="modal-form">
          <label>Nombre identificador<input name="displayName" required placeholder="Ej. Hotel Casa Nova" /></label>
          <label>Número de WhatsApp<input name="phoneNumber" required placeholder="+57 300 000 0000" /></label>
          <div className="modal-actions"><button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Registrando…" : "Registrar"}</button></div>
        </form>
      </Modal>}

      {sendOpen && <Modal close={() => setSendOpen(false)} title="Probar notificación" description="Envía un mensaje real desde una línea conectada.">
        <form onSubmit={sendMessage} className="modal-form">
          <label>Línea emisora<select name="fromPhoneNumber" required>{senders.filter(s => s.status === "connected").map(s => <option key={s.id} value={s.phoneNumber}>{s.displayName} · {s.phoneNumber}</option>)}</select></label>
          <label>Número de destino<input name="toPhoneNumber" required placeholder="+57 300 000 0000" /></label>
          <label>Mensaje<textarea name="message" required placeholder="Escribe una notificación de prueba…" /></label>
          <div className="modal-actions"><button type="button" className="secondary" onClick={() => setSendOpen(false)}>Cancelar</button><button className="primary" disabled={busy}><Send size={15} />{busy ? "Enviando…" : "Enviar"}</button></div>
        </form>
      </Modal>}

      {connection && <Modal close={() => { setConnection(null); setQrImage(""); }} title={connection.sender.displayName} description={connection.sender.phoneNumber}>
        <div className="connection-content">
          {connection.session.status === "connected" ? <><div className="success-circle"><CheckCircle2 /></div><h3>Línea conectada</h3><p>La sesión está lista para enviar notificaciones.</p></>
          : qrImage ? <><div className="qr-frame">{/* El QR es un data URL generado localmente y no requiere optimización remota. */}<img src={qrImage} alt="Código QR para vincular WhatsApp" /></div><h3>Escanea el código QR</h3><p>Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo.</p><small>El estado se actualiza automáticamente cada 5 segundos.</small></>
          : <><div className="loader" /><h3>Preparando la sesión</h3><p>Estamos esperando el código QR de WhatsApp…</p></>}
        </div>
      </Modal>}

      {notice && <div className="toast" onAnimationEnd={() => window.setTimeout(() => setNotice(""), 2500)}>{notice}<button onClick={() => setNotice("")}>×</button></div>}
    </main>
  );
}

function Modal({ close, title, description, children }: { close: () => void; title: string; description: string; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><h2>{title}</h2><p className="modal-description">{description}</p>{children}</section></div>;
}
