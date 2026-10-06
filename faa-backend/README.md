# FAA A&P Exam Trainer — Backend

API REST en **Express + TypeScript + MongoDB (Mongoose)** para el simulador de exámenes de mecánico A&P de la FAA. Protege el banco de preguntas detrás de autenticación (login), sirve las preguntas escritas / con figura / orales, genera exámenes aleatorios del tamaño oficial y guarda el progreso de cada alumno.

## Qué incluye

- **Autenticación JWT** con contraseñas cifradas (bcrypt) y roles `student` / `admin`.
- **Banco protegido**: ninguna ruta de preguntas responde sin un token válido.
- **Datos reales incluidos** en `data/`: 3.021 escritas (texto), 114 con figura, 1.124 orales — bilingüe ES/EN, verificadas contra los handbooks vigentes FAA‑H‑8083‑30B/31B/32B.
- **Generador de examen** oficial: AMG 60, AMA 100, AMP 100 (70% para aprobar).
- **Progreso por materia** con dominio al 80%.
- Seguridad: `helmet`, `cors`, `compression`, `express-rate-limit`, validación con `zod`.
- Listo para **Docker** (`docker compose up`).

## Requisitos

- Node.js 18+
- MongoDB 6/7 (local, o MongoDB Atlas)

## Puesta en marcha (local)

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar entorno
cp .env.example .env
#   edita .env: MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3) Cargar el banco de preguntas + crear el admin
npm run seed

# 4) Arrancar en desarrollo (recarga automática)
npm run dev
# API en http://localhost:4000
```

Producción:

```bash
npm run build
npm run seed:prod   # una sola vez
npm start
```

## Despliegue en Vercel

En Vercel importa el repositorio y selecciona `faa-backend` como **Root Directory**. El backend exporta su aplicación Express desde `src/app.ts`, que Vercel detecta automáticamente; no configures `app.listen`, una carpeta `api/`, ni rewrites manuales.

Configura estas variables de entorno para **Production** antes de desplegar:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://...             # URI de MongoDB Atlas accesible desde Internet
JWT_SECRET=<secreto largo, único y aleatorio>
CORS_ORIGIN=https://tu-frontend.vercel.app
APP_URL=https://tu-frontend.vercel.app       # URL para enlaces de invitación
JWT_EXPIRES_IN=7d
```

`ADMIN_EMAIL` y `ADMIN_PASSWORD` solo hacen falta para ejecutar el seed. Ejecuta `npm run seed:prod` una vez desde un entorno con acceso a la misma base de datos; no como parte de cada despliegue. Tras el despliegue, prueba `https://<tu-backend>.vercel.app/api/health`.

### Restablecimiento de contraseña por correo

El flujo de contraseña usa Nodemailer con un código de seis dígitos, válido por 10 minutos y de un solo uso. Configura un buzón de [Namecheap Private Email](https://www.namecheap.com/support/knowledgebase/article.aspx/1179/2175/general-private-email-configuration-for-mail-clients-and-mobile-devices/) para enviar los mensajes:

```text
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@tu-dominio.com
SMTP_PASSWORD=<contraseña del buzón>
SMTP_FROM=no-reply@tu-dominio.com
```

Private Email también admite el puerto 587 con TLS/STARTTLS; en ese caso usa `SMTP_PORT=587` y `SMTP_SECURE=false`.

## Con Docker (todo incluido, sin instalar Mongo)

```bash
docker compose up --build
# Levanta MongoDB + la API, corre el seed y queda escuchando en :4000
```

## Suscripción con Stripe

El acceso a preguntas, exámenes y progreso requiere una suscripción mensual activa (administradores están exentos). La integración utiliza Stripe Checkout Sessions y webhooks.

### Configuración de Stripe

1. **Crea una cuenta en [Stripe](https://dashboard.stripe.com)** y obtén tus claves API (Test/Live).

2. **Configura las variables de entorno** en `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   # Precio en centavos (999 = $9.99) — se crea automáticamente en cada checkout
   STRIPE_SUBSCRIPTION_AMOUNT=999
   STRIPE_SUBSCRIPTION_CURRENCY=usd
   STRIPE_PRODUCT_NAME=SkyMentor Monthly
   STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success
   STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel
   ```
   Para cambiar el precio, solo modifica `STRIPE_SUBSCRIPTION_AMOUNT` y redesplega.
   Opcionalmente, puedes usar un Price ID pre-creado en el Dashboard: `STRIPE_PRICE_ID=price_...`

3. **Configura el webhook** en el Dashboard de Stripe:
   - **URL de producción:** `https://tu-backend.vercel.app/api/billing/webhook`
   - **Eventos a escuchar:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copia el **Signing Secret** a `STRIPE_WEBHOOK_SECRET`

5. **Pruebas locales con Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:4000/api/billing/webhook
   # Copia el whsec_... que aparece en la terminal a tu .env
   ```

### Flujo de suscripción

1. El usuario se registra (gratis) y se le redirige a `/profile`
2. En `/profile` hace clic en "Suscribirse" → se le redirige a Stripe Checkout
3. Tras el pago exitoso, Stripe envía el webhook `checkout.session.completed`
4. El backend actualiza el `subscriptionStatus` del usuario a `active`
5. El usuario puede acceder a todas las funciones
6. Desde `/profile` puede cancelar la suscripción (acceso hasta fin de período)

## Endpoints

Base: `/api`

| Método | Ruta | Auth | Suscripción | Descripción |
|-------|------|------|-------------|-------------|
| GET  | `/health` | — | — | Estado del servicio |
| POST | `/auth/register` | — | — | Registrar alumno (`name`, `email`, `password`) |
| POST | `/auth/login` | — | — | Iniciar sesión → devuelve `token` |
| POST | `/auth/password-reset/request` | — | — | Envía un código de restablecimiento de seis dígitos |
| POST | `/auth/password-reset/verify` | — | — | Verifica el código de seis dígitos y devuelve un ticket temporal |
| POST | `/auth/password-reset/confirm` | — | — | Restablece la contraseña con el ticket temporal y `password` |
| GET  | `/auth/me` | Bearer | — | Perfil del usuario autenticado |
| POST | `/billing/checkout` | Bearer | — | Crear sesión de Stripe Checkout |
| POST | `/billing/cancel` | Bearer | — | Cancelar suscripción al final del período |
| GET  | `/billing/status` | Bearer | — | Estado de la suscripción |
| POST | `/billing/webhook` | — | — | Webhook de Stripe (firma verificada) |
| GET  | `/questions/subjects?rating=AMP` | Bearer | Requerida | Materias con conteos |
| GET  | `/questions/written?rating=&subject=&limit=&random=true` | Bearer | Requerida | Preguntas escritas de texto |
| GET  | `/questions/figures?rating=&subject=` | Bearer | Requerida | Preguntas con figura (imagen en base64) |
| GET  | `/questions/oral?rating=&subject=` | Bearer | Requerida | Banco oral (pregunta/respuesta) |
| GET  | `/exam/written/:rating?count=NN` | Bearer | Requerida | Examen aleatorio (por defecto tamaño oficial) |
| GET  | `/progress` | Bearer | Requerida | Progreso del alumno |
| POST | `/progress` | Bearer | Requerida | Registrar `{rating, subject, correct, attempted}` |

Autenticación: envía el token en el header `Authorization: Bearer <token>`.

Hay un archivo `requests.http` con ejemplos listos para probar (VS Code REST Client / IntelliJ).

## Estructura del proyecto

```
src/
  config/      env y conexión a MongoDB
  models/      User, WrittenQuestion, FigureQuestion, OralQuestion, Progress
  middleware/  auth (JWT), validación (zod), suscripción, manejo de errores
  controllers/ auth, billing, questions, exam, progress
  routes/      auth, billing, questions, exam, progress
  seed/        carga de datos + creación del admin
  utils/       jwt, ApiError, asyncHandler
data/          los 3 bancos en JSON (escrito, figuras, oral)
```

## Notas de seguridad para producción

- Cambia `JWT_SECRET` por una cadena larga y aleatoria, y `ADMIN_PASSWORD`.
- Limita `CORS_ORIGIN` al dominio real de tu app (no uses `*`).
- Sirve todo por HTTPS y considera un proxy inverso (Nginx) delante de la API.
- Las claves de Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) deben ser las de **producción** (no test) en producción.
- Configura `STRIPE_SUCCESS_URL` y `STRIPE_CANCEL_URL` con tu dominio de producción.

---
© JJ Aeronautic Services — Uso interno del producto FAA A&P Exam Trainer.
