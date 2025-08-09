// src/pages/api/cron/recordatorios.ts
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

// Día “hoy” en Buenos Aires (no UTC)
function diaHoyBuenosAires(): number {
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
  });
  return Number(fmt.format(new Date()));
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
  // Opcional: simple protección con token
  const token = req.headers['x-cron-token'] || req.query.token;
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const hoy = diaHoyBuenosAires(); // 1..31
    const { rows: usuarios } = await pool.query<{
      name: string;
      email: string;
      recordatorio: number;
    }>('SELECT name, email, recordatorio FROM usuarios WHERE recordatorio = $1', [hoy]);

    const resultados = await Promise.allSettled(
      usuarios.map(u => enviarRecordatorio(u.email, u.name, u.recordatorio))
    );

    const ok = resultados.filter(r => r.status === 'fulfilled').length;
    const fail = resultados.length - ok;

    return res.status(200).json({ sent: ok, failed: fail });
  } catch (err: any) {
    console.error('[CRON recordatorios] error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
