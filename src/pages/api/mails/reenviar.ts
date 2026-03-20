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

const ASUNTO = '💪 Recordatorio de pago de gimnasio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, nombre } = req.body as { email?: string; nombre?: string };
  if (!email || !nombre) {
    return res.status(400).json({ error: 'Faltan email o nombre' });
  }

  let estado: 'enviado' | 'error' = 'enviado';
  let errorDetalle: string | null = null;

  try {
    await transporter.sendMail({
      from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: ASUNTO,
      html: `
        <p>Hola ${nombre},</p>
        <p>Este es un recordatorio para abonar tu mensualidad del gimnasio 💸.</p>
        <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
        <hr/>
        <p><small>Mensaje automático. No responder.</small></p>
      `,
    });
  } catch (err: any) {
    estado = 'error';
    errorDetalle = err?.message ?? 'Error desconocido';
  }

  // Registrar el intento
  try {
    await pool.query(
      `INSERT INTO mails_enviados (email, nombre, asunto, estado, error_detalle)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, nombre, `${ASUNTO} (reenvío)`, estado, errorDetalle]
    );
  } catch (logErr) {
    console.error('[reenviar] Error al loguear:', logErr);
  }

  if (estado === 'error') {
    return res.status(500).json({ error: errorDetalle });
  }
  return res.status(200).json({ success: true });
}
