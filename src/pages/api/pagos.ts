// pages/api/pagos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

type PagosMap = Record<string, string[]>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query<{ email: string; fecha: string }>(
        'SELECT email, fecha FROM pagos ORDER BY email, fecha'
      );

      const pagosMap: PagosMap = {};
      for (const { email, fecha } of rows) {
        if (!pagosMap[email]) pagosMap[email] = [];
        pagosMap[email].push(fecha);
      }

      return res.status(200).json(pagosMap);
    }

    if (req.method === 'POST') {
      const { email, fecha } = req.body as { email?: string; fecha?: string };
      if (!email) return res.status(400).json({ error: 'Falta email' });

      // default: mes actual en formato YYYY-MM
      const fechaUso =
        fecha ??
        new Date().toISOString().slice(0, 7); // "YYYY-MM"

      // Validación simple YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(fechaUso)) {
        return res.status(400).json({ error: 'fecha debe ser "YYYY-MM"' });
      }
      const mm = Number(fechaUso.slice(5));
      if (mm < 1 || mm > 12) {
        return res.status(400).json({ error: 'Mes inválido en fecha' });
      }

      try {
        await pool.query(
          'INSERT INTO pagos (email, fecha) VALUES ($1, $2)',
          [email, fechaUso]
        );
      } catch (e: any) {
        // 23503 = foreign_key_violation (si existe FK a usuarios(email))
        if (e?.code === '23503') {
          return res.status(400).json({ error: 'El usuario no existe' });
        }
        throw e;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('API /pagos error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
