# WhatsApp Admin

Panel administrativo en Next.js para gestionar los emisores y sesiones de la API de WhatsApp de CML Solutions.

## Funcionalidades

- Acceso administrativo mediante sesión segura `httpOnly`.
- Registro y consulta de líneas emisoras.
- Inicio de conexión y visualización del código QR.
- Actualización automática del estado cada cinco segundos mientras se conecta.
- Desconexión de sesiones.
- Envío de notificaciones de prueba.
- Proxy del servidor: la API key nunca se expone al navegador.

## Requisitos

- Node.js 20.9 o superior.
- Acceso a la API de WhatsApp.

## Configuración local

Instala las dependencias:

```bash
npm install
```

Copia `.env.example` como `.env.local` y configura:

```env
WHATSAPP_API_URL=https://tu-api-de-whatsapp.com/api
WHATSAPP_API_KEY=clave-del-backend
ADMIN_EMAIL=correo-del-administrador
ADMIN_PASSWORD=contraseña-segura
AUTH_SECRET=secreto-aleatorio
```

Para generar `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Inicia el proyecto:

```bash
npm run dev
```

## Despliegue en Vercel

1. Importa el repositorio desde GitHub.
2. Vercel detectará Next.js automáticamente.
3. Agrega las cinco variables anteriores en **Settings → Environment Variables**.
4. Despliega el proyecto.

No agregues `.env.local` al repositorio.
