// pages/api/mails/qr.ts — Envía (o reenvía) por mail el QR de acceso de un usuario.
// POST { email }
//
// FLAG: el envío está deshabilitado salvo que ENVIAR_QR_POR_MAIL=true en el
// entorno. Mientras esté apagado, el endpoint responde { skipped: true } sin
// enviar ni loguear nada (para testear en local sin mandar mails reales).
const ENVIO_HABILITADO = process.env.ENVIAR_QR_POR_MAIL === 'true';

import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import { getQrTokenByEmail, qrPngBuffer } from '@/lib/qr';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

const ASUNTO = '🎫 Tu código QR de acceso - SOMA Gym';

async function ensureMailsTable() {
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Falta email' });

  try {
    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM usuarios WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const nombre = rows[0].name;

    if (!ENVIO_HABILITADO) {
      console.log(`[mails/qr] Envío deshabilitado por flag — no se envió el QR a ${email}`);
      return res.status(200).json({ success: true, skipped: true });
    }

    const token = await getQrTokenByEmail(email);
    if (!token) return res.status(404).json({ error: 'Usuario sin QR' });
    const png = await qrPngBuffer(token);

    let estado: 'enviado' | 'error' = 'enviado';
    let errorDetalle: string | null = null;

    try {
      await transporter.sendMail({
        from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: ASUNTO,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <p>Hola ${nombre},</p>
            <p>Este es tu código QR personal de acceso al gimnasio. Mostralo en recepción al llegar para registrar tu asistencia 🏋️‍♂️.</p>
            <p style="text-align:center"><img src="cid:qr-soma" alt="Tu código QR" width="256" height="256"/></p>
            <p>También lo encontrás adjunto en este mail para guardarlo en tu teléfono.</p>
            <hr style="margin-top:32px"/>
            <p><small style="color:#888">Mensaje enviado desde SOMA Gym. No responder.</small></p>
          </div>
        `,
        attachments: [
          {
            filename: 'qr-soma.png',
            content: png,
            contentType: 'image/png',
            cid: 'qr-soma',
          },
        ],
      });
    } catch (err: any) {
      estado = 'error';
      errorDetalle = err?.message ?? 'Error desconocido';
    }

    // Registrar el intento (no lanzar si falla el log)
    try {
      await ensureMailsTable();
      await pool.query(
        `INSERT INTO mails_enviados (email, nombre, asunto, estado, error_detalle)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, nombre, ASUNTO, estado, errorDetalle]
      );
    } catch (logErr) {
      console.error('[mails/qr] Error al loguear:', logErr);
    }

    if (estado === 'error') {
      return res.status(500).json({ error: errorDetalle });
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('API /mails/qr error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
