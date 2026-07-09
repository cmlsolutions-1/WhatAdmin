"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, MessageCircleMore } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setError(payload.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand"><span><MessageCircleMore /></span>pulse</div>
        <div>
          <p className="kicker">CML SOLUTIONS</p>
          <h1>Tus líneas de WhatsApp,<br />bajo control.</h1>
          <p>Conecta, supervisa y recupera las sesiones de tus clientes desde un único lugar.</p>
        </div>
        <small>Panel interno · Acceso restringido</small>
      </section>
      <section className="login-side">
        <form className="login-card" method="post" onSubmit={submit}>
          <div className="lock-icon"><LockKeyhole size={20} /></div>
          <h2>Bienvenido</h2>
          <p>Ingresa con tus credenciales administrativas.</p>
          <label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="admin@empresa.com" /></label>
          <label>Contraseña<input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" /></label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? "Ingresando…" : "Ingresar al panel"}<ArrowRight size={17} /></button>
        </form>
      </section>
    </main>
  );
}
