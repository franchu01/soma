// pages/api/cron/recordatorio-deuda.ts — Recordatorio a los usuarios en
// deuda (cuota vencida y sin pagar), reenviado cada 5 días mientras sigan
// sin pagar. Invocado diariamente por Vercel; la periodicidad de 5 días se
// logra consultando mails_enviados (mismo patrón idempotente que el resto
// de los mails del sistema), no con un cron cada 5 días.
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import {
  ASUNTO_DEUDA, deudaMailHtml,
  ensureMailsTable, enviarMailYRegistrar, sleep, DELAY_ENTRE_MAILS_MS,
} from '@/lib/mailer';
import { procesarColaReintentos } from '@/lib/reintentos';

// Día y mes de hoy en Buenos Aires (no UTC), igual que el resto de los crons
function hoyBuenosAires(): { dia: number; mes: string } {
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { dia: Number(get('day')), mes: `${get('year')}-${get('month')}` };
}

function enviarYLoguear(email: string, nombre: string) {
  return enviarMailYRegistrar({
    to: email,
    nombre,
    asunto: ASUNTO_DEUDA,
    html: deudaMailHtml(nombre),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers['x-cron-token'] || req.query.token;
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await ensureMailsTable();
    const { dia, mes } = hoyBuenosAires();

    // En deuda: ya pasó su día de recordatorio y no pagó el mes actual.
    // Se salta a quien ya recibió este mail hace menos de 5 días.
    const { rows: usuarios } = await pool.query<{ name: string; email: string }>(
      `SELECT u.name, u.email
       FROM usuarios u
       WHERE u.recordatorio <= $1
         AND NOT EXISTS (SELECT 1 FROM bajas b WHERE b.email = u.email)
         AND NOT EXISTS (
           SELECT 1 FROM pagos p WHERE p.email = u.email AND p.fecha LIKE $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM mails_enviados m
           WHERE m.email = u.email AND m.asunto = $3 AND m.estado = 'enviado'
             AND m.fecha_envio > NOW() - INTERVAL '5 days'
         )`,
      [dia, `${mes}%`, ASUNTO_DEUDA]
    );

    // Secuencial a propósito: en paralelo Gmail corta la conexión.
    let ok = 0;
    let fail = 0;
    for (const u of usuarios) {
      const estado = await enviarYLoguear(u.email, u.name);
      if (estado === 'enviado') ok++; else fail++;
      await sleep(DELAY_ENTRE_MAILS_MS);
    }

    // Se aprovecha esta misma corrida diaria para procesar la cola de
    // reintentos de recordatorio/bienvenida/reactivación (ver lib/reintentos.ts)
    // en vez de sumar un cron nuevo en vercel.json.
    const cola = await procesarColaReintentos();

    return res.status(200).json({ sent: ok, failed: fail, dia, mes, cola });
  } catch (err: any) {
    console.error('[CRON recordatorio-deuda] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
