// pages/api/qr.ts — Devuelve el QR de un usuario como imagen PNG.
// GET /api/qr?email=...            → muestra inline
// GET /api/qr?email=...&download=1 → fuerza descarga
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { ensureQrToken, qrPngBuffer } from '@/lib/qr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const email = req.query.email as string | undefined;
  if (!email) return res.status(400).json({ error: 'Falta email' });

  try {
    await ensureQrToken();
    const { rows } = await pool.query<{ qr_token: string; name: string }>(
      'SELECT qr_token, name FROM usuarios WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const png = await qrPngBuffer(rows[0].qr_token);
    const filename = `qr-soma-${rows[0].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (req.query.download) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.status(200).send(png);
  } catch (err: any) {
    console.error('API /qr error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
