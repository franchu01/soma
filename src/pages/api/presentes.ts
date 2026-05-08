import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS presentes (
      id SERIAL PRIMARY KEY,
      email VARCHAR NOT NULL REFERENCES usuarios(email) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      UNIQUE(email, fecha)
    )
  `);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { fecha, email } = req.query;

      if (email) {
        // Historial de asistencia de un usuario específico
        const result = await pool.query(
          `SELECT fecha FROM presentes WHERE email = $1 ORDER BY fecha DESC`,
          [email]
        );
        return res.status(200).json(result.rows.map((r: any) => r.fecha.toISOString().split('T')[0]));
      }

      if (fecha) {
        // Presentes de un día específico
        const result = await pool.query(
          `SELECT p.email, u.name, u.sede
           FROM presentes p
           JOIN usuarios u ON u.email = p.email
           WHERE p.fecha = $1
           ORDER BY u.name ASC`,
          [fecha]
        );
        return res.status(200).json(result.rows);
      }

      // Conteo diario para estadísticas (últimos 90 días)
      const result = await pool.query(
        `SELECT fecha::text, COUNT(*) as cantidad
         FROM presentes
         WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY fecha
         ORDER BY fecha ASC`
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { email, fecha } = req.body as { email?: string; fecha?: string };
      if (!email || !fecha) return res.status(400).json({ error: 'Faltan datos' });

      await pool.query(
        `INSERT INTO presentes (email, fecha) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [email, fecha]
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { email, fecha } = req.body as { email?: string; fecha?: string };
      if (!email || !fecha) return res.status(400).json({ error: 'Faltan datos' });

      await pool.query(
        `DELETE FROM presentes WHERE email = $1 AND fecha = $2`,
        [email, fecha]
      );
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err: any) {
    console.error('API /presentes error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
