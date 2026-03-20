import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS, // app password recomendado
  },
});

// Día y mes de hoy en Buenos Aires (no UTC)
function hoyBuenosAires(): { dia: number; mes: string } {
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const dia = Number(get('day'));
  const mes = `${get('year')}-${get('month')}`; // YYYY-MM
  return { dia, mes };
}

async function enviarRecordatorio(email: string, nombre: string, dia: number) {
  const info = await transporter.sendMail({
    from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '💪 Recordatorio de pago de gimnasio',
    html: `
      <p>Hola ${nombre},</p>
      <p>Hoy es día ${dia} del mes.</p>
      <p>No olvides abonar tu mensualidad del gimnasio 💸.</p>
      <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
      <hr/>
      <p><small>Mensaje automático. No responder.</small></p>
    `,
  });
  return info.messageId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protección con token (desactivada si no seteás CRON_TOKEN)
  const token = req.headers['x-cron-token'] || req.query.token;
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { dia, mes } = hoyBuenosAires();

    // Solo enviar a usuarios:
    // 1. Cuyo día de recordatorio coincide con hoy
    // 2. Que NO tengan baja este mes
    // 3. Que NO hayan pagado este mes (cualquier fecha que empiece con YYYY-MM)
    const { rows: usuarios } = await pool.query<{
      name: string;
      email: string;
      recordatorio: number;
    }>(
      `SELECT u.name, u.email, u.recordatorio
       FROM usuarios u
       WHERE u.recordatorio = $1
         AND NOT EXISTS (
           SELECT 1 FROM bajas b
           WHERE b.email = u.email AND b.fecha = $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM pagos p
           WHERE p.email = u.email AND p.fecha LIKE $3
         )`,
      [dia, mes, `${mes}%`]
    );

    const resultados = await Promise.allSettled(
      usuarios.map(u => enviarRecordatorio(u.email, u.name, u.recordatorio))
    );

    const ok = resultados.filter(r => r.status === 'fulfilled').length;
    const fail = resultados.length - ok;

    return res.status(200).json({ sent: ok, failed: fail, dia, mes });
  } catch (err: any) {
    console.error('[CRON recordatorios] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
