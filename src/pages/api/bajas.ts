// src/pages/api/bajas.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

// Mes actual en TZ local (evita problemas de UTC)
function mesActualYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mesActual = mesActualYYYYMM();

  try {
    if (req.method === 'POST') {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      try {
        // Evita duplicar la baja del mes si ya existe
        await pool.query(
          `INSERT INTO bajas (email, fecha)
           SELECT $1, $2
           WHERE NOT EXISTS (SELECT 1 FROM bajas WHERE email = $1 AND fecha = $2)`,
          [email, mesActual]
        );
      } catch (e: any) {
        if (e?.code === '23503') {
          return res.status(400).json({ error: 'El usuario no existe' });
        }
        throw e;
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      // Reactivar = borrar TODAS las bajas del usuario (la baja persiste entre meses
      // hasta que se reactiva explícitamente)
      await pool.query('DELETE FROM bajas WHERE email = $1', [email]);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const { rows } = await pool.query<{ email: string; fecha: string }>(
        'SELECT email, fecha FROM bajas ORDER BY email, fecha'
      );

      const bajasMap: Record<string, string[]> = {};
      for (const { email, fecha } of rows) {
        if (!bajasMap[email]) bajasMap[email] = [];
        bajasMap[email].push(fecha);
      }
      return res.status(200).json(bajasMap);
    }

    return res.status(405).end();
  } catch (error) {
    console.error('[ERROR EN /api/bajas]:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
