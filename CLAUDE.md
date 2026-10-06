# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOMA is a gym management system built with Next.js. It handles member registration, payment tracking, cancellations, statistics, and automated email reminders across 3 branches (Temperley, Calzada, Pension).

## Commands

```bash
npm run dev      # Development server with Turbopack at localhost:3000
npm run build    # Production build
npm start        # Serve production build
npm run lint     # ESLint with Next.js/TypeScript rules
```

No test framework is configured.

## Architecture

**Stack:** Next.js 15 (Pages Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL (Neon via `pg`), Nodemailer (Gmail SMTP)

**Database** (`src/lib/db.ts`): Single PostgreSQL pool shared across all API routes.

```
usuarios       (email PK, name UNIQUE, created_at, recordatorio INT 1-31, sede,
                qr_token UUID UNIQUE DEFAULT gen_random_uuid(), foto_url TEXT)
pagos          (email FK, fecha YYYY-MM)
bajas          (email FK, fecha YYYY-MM)
presentes      (id, email FK, fecha DATE, UNIQUE(email, fecha))
mails_enviados (id, email, nombre, asunto, fecha_envio, estado enviado|error,
                error_detalle) — log of every mail attempt; also used to make
                the reminder crons idempotent (see below)
mails_pendientes (id, email, tipo, intentos, proximo_intento, creado_en,
                UNIQUE(email, tipo)) — retry queue for automatic mails that
                keep failing; see "Automatic retry queue" below
```

Payment status per member (`getEstadoPago` in `ListaUsuarios.tsx`, mirrored in `scan.ts`):
`pagado` (paid this month) / `pendiente` (unpaid, `recordatorio` day hasn't hit yet) / `deuda` (unpaid, day has passed).

**Profile photos** (`src/lib/foto.ts`, `src/lib/imagen.ts`, `src/components/FotoUsuario.tsx`): each member can have a profile photo, shown as a clickable avatar next to their name in `ListaUsuarios` (both the mobile cards and the desktop table) so staff can recognize faces at a glance. Clicking it opens the device camera/file picker (`<input capture="environment">`), the image is resized and re-encoded to WebP client-side (`comprimirImagen` in `lib/imagen.ts`, ~15-40KB output) before it's ever uploaded, and `POST /api/foto` (`{ email, dataUrl }`) stores it in **Vercel Blob** (store `soma-fotos`, public access) — not Postgres, to keep binaries and their I/O off the shared DB pool — saving only the resulting public URL in `usuarios.foto_url`. Uploading a new photo deletes the previous Blob object.

The Blob store must be **connected to all three environments** (Production, Preview, Development) from the Vercel dashboard's Storage tab — connecting it auto-provisions `BLOB_STORE_ID` and enables OIDC federation for those environments, which `@vercel/blob` uses automatically (via `VERCEL_OIDC_TOKEN`, refreshed per-request on Vercel, or pulled locally with `vercel env pull`) — no static token needed day-to-day. A `BLOB_READ_WRITE_TOKEN` may also exist as a fallback but isn't the primary auth path. **Env var changes require a redeploy** — Vercel bakes them in at build time, so recreating/reconnecting the store needs `vercel --prod` (or a new commit) before production picks up the new credentials, not just a dashboard change.

**Mail sending** (`src/lib/mailer.ts`): Shared Nodemailer transporter (`pool: true, maxConnections: 1` — forces Gmail to see a single reused connection instead of many parallel logins, which is what was causing `421 Temporary System Problem` throttling errors before this was added), `FROM` address, HTML templates (`qrMailHtml`, `bienvenidaMailHtml`, `recordatorioMailHtml`, `deudaMailHtml`).

Every actual send goes through **`enviarMailYRegistrar()`** — the single choke point for sending mail in this app. It: validates email format (`emailValido`) and domain existence via MX lookup (`tieneDominioValido`, DNS-cached in-memory per instance) *before* touching SMTP; sends via the shared transporter; treats a non-empty `info.rejected` from nodemailer as a failure even though `sendMail()` didn't throw (Gmail can accept the connection but still reject the recipient); retries once after a 2s backoff on any failure; and always logs the outcome to `mails_enviados` via `logMail`/`ensureMailsTable` — it never throws. All mail-sending routes (`cron/recordatorios.ts`, `cron/recordatorio-deuda.ts`, `mails/qr.ts`, `mails/qr-masivo.ts`, `mails/enviar.ts`, `mails/reenviar.ts`, `enviarQrBienvenida`) call this instead of touching `transporter` directly.

**Bulk sends must stay sequential**, one `await` at a time with a `sleep(DELAY_ENTRE_MAILS_MS)` (400ms) between each — never `Promise.all` over a list of recipients. Firing many `sendMail()` calls concurrently is what triggers Gmail's throttling; this was the root cause of the mail-delivery complaints fixed in October 2026 (confirmed via the `421-4.3.0 Temporary System Problem` errors already logged in `mails_enviados`, all timestamped within the same cron run).

**Automatic retry queue** (`src/lib/reintentos.ts`, table `mails_pendientes`): for the "automatic" mails — nobody is watching the result when they fire — a failure even after `enviarMailYRegistrar`'s built-in immediate retry gets queued via `encolarReintento(email, tipo)` and retried with exponential backoff **in days** (1 → 2 → 4 → 8, capped at `MAX_INTENTOS = 5` attempts total, then abandoned — the last error stays visible in `mails_enviados` for manual resend). Day-granularity is a deliberate consequence of Vercel's cron minimum being once/day on the free plan; true minute/hour backoff would need Vercel Pro or an external scheduler. `procesarColaReintentos()` runs at the end of `cron/recordatorio-deuda.ts` (piggybacking on that daily invocation) rather than needing a third `vercel.json` cron entry. Covers `'recordatorio'` (monthly reminder — re-checks the user hasn't since paid or been deactivated before resending) and `'bienvenida'`/`'reactivacion'` (also lives in this file, not `mailer.ts`, to avoid a circular import with the queue functions). `'deuda'` is deliberately **not** in this queue — `cron/recordatorio-deuda.ts` already retries daily for as long as the user stays in debt, which is better behavior for that case than a 5-attempt cap would be.

None of this can confirm a mail actually reached the recipient's inbox (no opens/bounce tracking) — Gmail SMTP doesn't expose that. The honest answer to "did it arrive" stops at "Gmail's server accepted it for delivery and didn't reject the recipient inline." Real delivery/bounce confirmation would require moving off Gmail SMTP to a transactional provider (e.g. Resend, Postmark) with webhooks — not done here, since Gmail is free and this app's volume is small; flagged as a possible future step, not implemented.

**API Routes** (`src/pages/api/`):
- `users.ts` — full CRUD; PUT cascades email changes to `pagos` and `bajas`; POST sends the welcome/QR mail
- `pagos.ts` — GET returns `Map<email, fecha[]>`; POST records a monthly payment
- `bajas.ts` — GET/POST/DELETE for cancellations; DELETE (reactivation) resends the welcome/QR mail
- `presentes.ts` — GET/POST/DELETE for daily attendance. GET supports `?email=` (one user's history), `?emails=a,b,c` (bulk history for several users, e.g. debtor attendance), `?fecha=` (who attended a given day), or no params (90-day daily counts by sede for stats)
- `foto.ts` — POST uploads a member's profile photo to Vercel Blob and updates `foto_url`; DELETE removes it. Expects an already-compressed image as a `dataUrl` (see Profile photos above)
- `qr.ts` — GET serves a member's QR code as PNG (`?download=1` forces download); QR content is `SOMA:<qr_token>` (see `src/lib/qr.ts`)
- `scan.ts` — POST resolves a scanned QR, records today's attendance, returns payment status + unpaid months
- `mails/qr.ts` — POST sends/resends one member's QR by email; gated by `ENVIAR_QR_POR_MAIL` (returns `{ skipped: true }` when off)
- `mails/qr-masivo.ts` — POST one-off bulk send of the QR to every member who hasn't received it yet (per `mails_enviados`); requires `CRON_TOKEN`; supports `dryRun=1`, `incluirBajas=1`, `limit=N`
- `mails/enviar.ts` / `mails/reenviar.ts` / `mails/index.ts` — free-text mail composer (`EnviarMail.tsx`) and sent-mail log (`MailsEnviados.tsx`)
- `cron/recordatorios.ts` — invoked daily by Vercel; sends the monthly payment reminder to users whose `recordatorio` day matches today (Buenos Aires timezone)
- `cron/recordatorio-deuda.ts` — invoked daily by Vercel; re-sends a debt reminder to every user currently `en deuda`, but skips anyone who already got one in the last 5 days (checked against `mails_enviados`) — this is what makes a daily cron behave like a 5-day reminder

Both cron routes and `mails/qr-masivo.ts` require a matching `x-cron-token` header or `?token=` query param when `CRON_TOKEN` is set.

**Frontend** (`src/pages/index.tsx`): Single-page app with tab navigation (Alta / Lista / Estadísticas / Modificar / Mails / Enviar / Presentes / Asistencia). Auth is handled by `Login.tsx` with session stored in localStorage.

**Key components:**
- `AltaUsuarios` — new member registration, optionally records first payment
- `ListaUsuarios` — member list with payment/cancellation history; each row shows a clickable `FotoUsuario` avatar to view/update the member's photo; includes a "¿Van al gym igual?" button that opens `DeudoresAsistencia`, a modal showing every debtor's last visit and visit count this month (via `presentes?emails=`), to see who's still training despite owing money
- `ModificarUsuarios` — edit member details, including a larger editable `FotoUsuario` avatar in the edit modal. Its modal is portaled to `document.body` (`createPortal`) rather than rendered inline — a `backdrop-blur` ancestor in `index.tsx` otherwise becomes the containing block for `position: fixed`, misplacing the modal; all modals in this app must be portaled for that reason
- `Estadisticas` — Chart.js charts filterable by sede
- `AsistenciaStats` — attendance charts and per-member attendance calendar
- `Header` — real-time clock, global search, export button, logout

## Environment Variables

```
DATABASE_URL        # Neon pooled PostgreSQL connection string
EMAIL_FROM          # Gmail sender address
EMAIL_PASS          # Gmail app-specific password
ENVIAR_QR_POR_MAIL  # "true" to enable sending QR codes by email (off by default)
CRON_TOKEN          # shared secret required by cron routes and mails/qr-masivo.ts
BLOB_STORE_ID        # auto-injected once a Blob store is connected to an environment; needed by /api/foto (see Profile photos above)
VERCEL_OIDC_TOKEN    # auto-injected on Vercel; for local dev, pull with `vercel env pull .env.local` after `vercel link` (short-lived — re-pull if it expires)
```

## Deployment

Deployed on Vercel. `vercel.json` configures two daily cron jobs: `/api/cron/recordatorios` (payment reminder) and `/api/cron/recordatorio-deuda` (debt reminder, effectively every 5 days per user via the `mails_enviados` lookback — see above).

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
