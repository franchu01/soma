import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { qrPngBuffer, ensureQrToken } from '@/lib/qr';
import {
  transporter, FROM, recordatorioMailHtml, qrAttachment,
  ensureMailsTable, logMail,
} from '@/lib/mailer';

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

async function enviarYLoguear(email: string, nombre: string, dia: number, qrToken: string | null) {
  let estado: 'enviado' | 'error' = 'enviado';
  let errorDetalle: string | null = null;

  try {
    // El QR va embebido; si por algún motivo el usuario no tiene token,
    // el recordatorio igual sale (sin la imagen).
    const png = qrToken ? await qrPngBuffer(qrToken) : null;
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: ASUNTO,
      html: recordatorioMailHtml(nombre, dia, png !== null),
      attachments: png ? [qrAttachment(png)] : [],
    });
  } catch (err: any) {
    estado = 'error';
    errorDetalle = err?.message ?? 'Error desconocido';
  }

  await logMail(email, nombre, ASUNTO, estado, errorDetalle);
  return estado;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers['x-cron-token'] || req.query.token;
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await ensureMailsTable();
    await ensureQrToken();

    const { dia, mes } = hoyBuenosAires();

    const { rows: usuarios } = await pool.query<{
      name: string;
      email: string;
      recordatorio: number;
      qr_token: string | null;
    }>(
      `SELECT u.name, u.email, u.recordatorio, u.qr_token
       FROM usuarios u
       WHERE u.recordatorio = $1
         AND NOT EXISTS (
           SELECT 1 FROM bajas b
           WHERE b.email = u.email
         )
         AND NOT EXISTS (
           SELECT 1 FROM pagos p
           WHERE p.email = u.email AND p.fecha LIKE $2
         )`,
      [dia, `${mes}%`]
    );

    const resultados = await Promise.all(
      usuarios.map(u => enviarYLoguear(u.email, u.name, dia, u.qr_token))
    );

    const ok = resultados.filter(r => r === 'enviado').length;
    const fail = resultados.filter(r => r === 'error').length;

    return res.status(200).json({ sent: ok, failed: fail, dia, mes });
  } catch (err: any) {
    console.error('[CRON recordatorios] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
