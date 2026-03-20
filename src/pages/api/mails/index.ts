import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export type MailEnviado = {
  id: number;
  email: string;
  nombre: string;
  asunto: string;
  fecha_envio: string; // ISO string
  estado: 'enviado' | 'error';
  error_detalle: string | null;
};

// Crea la tabla si no existe (primera vez que se llama)
async function ensureTable() {
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
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await pool.query<MailEnviado>(
        `SELECT id, email, nombre, asunto, fecha_envio, estado, error_detalle
         FROM mails_enviados
         ORDER BY fecha_envio DESC
         LIMIT 500`
      );
      return res.status(200).json(rows);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err: any) {
    console.error('[API /mails] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
