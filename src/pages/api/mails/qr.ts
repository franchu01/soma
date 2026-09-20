// pages/api/mails/qr.ts — Envía (o reenvía) por mail el QR de acceso de un usuario.
// POST { email }
//
// FLAG: el envío está deshabilitado salvo que ENVIAR_QR_POR_MAIL=true en el
// entorno. Mientras esté apagado, el endpoint responde { skipped: true } sin
// enviar ni loguear nada (para testear en local sin mandar mails reales).
const ENVIO_HABILITADO = process.env.ENVIAR_QR_POR_MAIL === 'true';

import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { getQrTokenByEmail, qrPngBuffer } from '@/lib/qr';
import {
  transporter, FROM, ASUNTO_QR as ASUNTO, qrMailHtml, qrAttachment,
  ensureMailsTable, logMail,
} from '@/lib/mailer';

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
        from: FROM,
        to: email,
        subject: ASUNTO,
        html: qrMailHtml(nombre),
        attachments: [qrAttachment(png)],
      });
    } catch (err: any) {
      estado = 'error';
      errorDetalle = err?.message ?? 'Error desconocido';
    }

    await ensureMailsTable();
    await logMail(email, nombre, ASUNTO, estado, errorDetalle);

    if (estado === 'error') {
      return res.status(500).json({ error: errorDetalle });
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('API /mails/qr error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
