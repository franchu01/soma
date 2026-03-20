import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
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
  const mes = `${get('year')}-${get('month')}`;
  return { dia, mes };
}

const ASUNTO = '💪 Recordatorio de pago de gimnasio';

async function enviarYLoguear(email: string, nombre: string, dia: number) {
  let estado: 'enviado' | 'error' = 'enviado';
  let errorDetalle: string | null = null;

  try {
    await transporter.sendMail({
      from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: ASUNTO,
      html: `
        <p>Hola ${nombre},</p>
        <p>Hoy es día ${dia} del mes.</p>
        <p>No olvides abonar tu mensualidad del gimnasio 💸.</p>
        <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
        <hr/>
        <p><small>Mensaje automático. No responder.</small></p>
      `,
    });
  } catch (err: any) {
    estado = 'error';
    errorDetalle = err?.message ?? 'Error desconocido';
  }

  // Registrar en la base de datos (no lanzar si falla el log)
  try {
    await pool.query(
      `INSERT INTO mails_enviados (email, nombre, asunto, estado, error_detalle)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, nombre, ASUNTO, estado, errorDetalle]
    );
  } catch (logErr) {
    console.error('[CRON] Error al loguear mail:', logErr);
  }

  return estado;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers['x-cron-token'] || req.query.token;
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Asegurar que la tabla existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mails_enviados (
        id           SERIAL PRIMARY KEY,
        email        VARCHAR NOT NULL,
        nombre       VARCHAR NOT NULL,
        asunto       VARCHAR NOT NULL,
        fecha_envio  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        estado       VARCHAR(10) NOT NULL DEFAULT 'enviado',
        error_detalle TEXT
      )
    `);

    const { dia, mes } = hoyBuenosAires();

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

    const resultados = await Promise.all(
      usuarios.map(u => enviarYLoguear(u.email, u.name, u.recordatorio))
    );

    const ok = resultados.filter(r => r === 'enviado').length;
    const fail = resultados.filter(r => r === 'error').length;

    return res.status(200).json({ sent: ok, failed: fail, dia, mes });
  } catch (err: any) {
    console.error('[CRON recordatorios] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
