import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse | Administración de WhatsApp",
  description: "Panel administrativo de conexiones WhatsApp",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
