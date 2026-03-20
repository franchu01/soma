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
usuarios (email PK, name UNIQUE, created_at, recordatorio INT 1-31, sede)
pagos    (email FK, fecha YYYY-MM)
bajas    (email FK, fecha YYYY-MM)
```

**API Routes** (`src/pages/api/`):
- `users.ts` — full CRUD; PUT cascades email changes to `pagos` and `bajas`
- `pagos.ts` — GET returns `Map<email, fecha[]>`; POST records a monthly payment
- `bajas.ts` — GET/POST/DELETE for cancellations
- `cron/recordatorios.ts` — invoked daily at 12:00 UTC by Vercel; sends HTML reminder emails to users whose `recordatorio` day matches today (Buenos Aires timezone)

**Frontend** (`src/pages/index.tsx`): Single-page app with tab navigation (Alta / Lista / Estadísticas / Modificar). Auth is handled by `Login.tsx` with session stored in localStorage.

**Key components:**
- `AltaUsuarios` — new member registration, optionally records first payment
- `ListaUsuarios` — member list with payment/cancellation history
- `ModificarUsuarios` — edit member details
- `Estadisticas` — Chart.js charts filterable by sede
- `Header` — real-time clock, global search, export button, logout

## Environment Variables

```
DATABASE_URL   # Neon pooled PostgreSQL connection string
EMAIL_FROM     # Gmail sender address
EMAIL_PASS     # Gmail app-specific password
```

## Deployment

Deployed on Vercel. `vercel.json` configures the daily cron job for `/api/cron/recordatorios`.

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
