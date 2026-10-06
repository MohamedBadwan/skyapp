# FAA A&P Exam Trainer — Frontend

Interfaz web en **Next.js 14 (App Router) + TypeScript + TailwindCSS** que consume el backend con login. Reemplaza a la app HTML embebida: aquí el banco vive en el servidor y solo se sirve tras iniciar sesión.

## Funcionalidad

- **Login / registro** con JWT (el token se guarda en el navegador).
- **Dashboard** con tu progreso por materia y habilitación.
- **Estudio por materia**: 3 opciones (A/B/C), feedback inmediato, incluye preguntas con figura, dominio al 80%; guarda el progreso en el backend.
- **Examen escrito**: simulacro cronometrado del tamaño oficial (AMG 60 · AMA 100 · AMP 100), calificación vs 70% y repaso con respuestas.
- **Examen oral (DME)**: escucha la pregunta en inglés (🔊 voz), responde hablando (🎤 micrófono, Chrome/Edge) con feedback inmediato por coincidencia de términos, y revela la respuesta modelo. 4 preguntas por materia (3 de 4 para aprobar).
- **Bilingüe ES/EN** con interruptor en la barra superior.

## Requisitos

- Node.js 18+
- El **backend** corriendo (ver `faa-backend`). Por defecto en `http://localhost:4000`.

## Puesta en marcha

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar la URL del backend
cp .env.local.example .env.local
#    NEXT_PUBLIC_API_URL=http://localhost:4000/api

# 3) Desarrollo
npm run dev
#    App en http://localhost:3000

# Producción
npm run build && npm start
```

> Asegúrate de haber corrido el `seed` del backend (crea el banco y el admin) antes de entrar.

## Estructura

```
src/
  app/
    layout.tsx           layout + providers + navbar
    page.tsx             dashboard (protegido)
    login/ register/     autenticación
    study/ exam/ oral/   los tres modos
  components/            Navbar, Protected, RatingPicker, QuestionCard, FigureView, Spinner
  context/               AuthContext (JWT), LangContext (ES/EN)
  lib/                   api.ts (cliente), types.ts, speech.ts (TTS + micrófono)
```

## Notas

- El micrófono usa la Web Speech API (`SpeechRecognition`), disponible en Chrome/Edge de escritorio y con conexión a internet. En otros navegadores el resto de la app funciona igual; solo se desactiva el botón de voz.
- Para producción, sirve el frontend por HTTPS y apunta `NEXT_PUBLIC_API_URL` al dominio real del backend (y limita el CORS del backend a ese dominio).

---
© JJ Aeronautic Services — FAA A&P Exam Trainer.
