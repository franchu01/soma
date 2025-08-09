// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM usuarios ORDER BY created_at DESC');
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const { name, email, recordatorio, sede } = req.body as {
        name?: string;
        email?: string;
        recordatorio?: number | string;
        sede?: string;
      };

      if (!name || !email || recordatorio === undefined || !sede) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Normalizo tipos
      const recNum = Number(recordatorio);
      if (!Number.isInteger(recNum) || recNum < 1 || recNum > 31) {
        return res.status(400).json({ error: 'recordatorio debe ser un entero (1-31)' });
      }

      // Checks de existencia
      const emailExists = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
      if (emailExists.rowCount! > 0) {
        return res.status(409).json({ error: 'Este email ya está registrado' });
      }

      const nameExists = await pool.query('SELECT 1 FROM usuarios WHERE name = $1', [name]);
      if (nameExists.rowCount! > 0) {
        return res.status(409).json({ error: 'Este nombre y apellido ya está registrado' });
      }

      const created_at = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      await pool.query(
        `INSERT INTO usuarios (email, name, created_at, recordatorio, sede)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, name, created_at, recNum, sede]
      );

      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ error: 'Falta email' });

      await pool.query('DELETE FROM usuarios WHERE email = $1', [email]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err: any) {
    console.error('API /users error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
