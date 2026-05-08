import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export type MailEnviado = {
  id: number;
  email: string;
  nombre: string;
  asunto: string;
  fecha_envio: string;
  estado: 'enviado' | 'error';
  error_detalle: string | null;
};

export type MailsResponse = {
  data: MailEnviado[];
  total: number;
  page: number;
  limit: number;
  totalEsteMes: number;
  totalErrorEsteMes: number;
  meses: string[];
};

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

function mesActualStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const PAGE_SIZE = 50;
      const page = Math.max(0, parseInt((req.query.page as string) ?? '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) ?? String(PAGE_SIZE), 10) || PAGE_SIZE));
      const offset = page * limit;

      const mes = (req.query.mes as string) || '';
      const estado = (req.query.estado as string) || '';
      const q = (req.query.q as string) || '';
      const mesActual = mesActualStr();

      // Build WHERE clause
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (mes) {
        params.push(mes);
        conditions.push(`TO_CHAR(fecha_envio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') = $${params.length}`);
      }
      if (estado === 'enviado' || estado === 'error') {
        params.push(estado);
        conditions.push(`estado = $${params.length}`);
      }
      if (q) {
        params.push(`%${q.toLowerCase()}%`);
        conditions.push(`(LOWER(nombre) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      // Main query (paginated)
      const dataResult = await pool.query<MailEnviado>(
        `SELECT id, email, nombre, asunto, fecha_envio, estado, error_detalle
         FROM mails_enviados
         ${where}
         ORDER BY fecha_envio DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      // Total count for pagination (with same filters)
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM mails_enviados ${where}`,
        params
      );

      // Stats for current month (no filters applied — always the real totals)
      const statsResult = await pool.query<{ total_mes: string; total_error_mes: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE TO_CHAR(fecha_envio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') = $1) as total_mes,
          COUNT(*) FILTER (WHERE TO_CHAR(fecha_envio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') = $1 AND estado = 'error') as total_error_mes
        FROM mails_enviados
      `, [mesActual]);

      // Distinct months for the filter dropdown
      const mesesResult = await pool.query<{ mes: string }>(`
        SELECT DISTINCT TO_CHAR(fecha_envio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') as mes
        FROM mails_enviados
        ORDER BY mes DESC
        LIMIT 24
      `);

      const response: MailsResponse = {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
        page,
        limit,
        totalEsteMes: parseInt(statsResult.rows[0].total_mes, 10),
        totalErrorEsteMes: parseInt(statsResult.rows[0].total_error_mes, 10),
        meses: mesesResult.rows.map(r => r.mes),
      };

      return res.status(200).json(response);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err: any) {
    console.error('[API /mails] error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
