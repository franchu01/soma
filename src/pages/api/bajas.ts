// src/pages/api/bajas.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const mesActual = new Date().toISOString().slice(0, 7); // yyyy-mm

  try {
    if (req.method === 'POST') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      db.prepare('INSERT INTO bajas (email, fecha) VALUES (?, ?)').run(email, mesActual);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      db.prepare('DELETE FROM bajas WHERE email = ? AND fecha = ?').run(email, mesActual);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const bajas = db.prepare('SELECT * FROM bajas').all();

      // Convertimos a formato { email: [fecha1, fecha2] }
      const bajasMap: Record<string, string[]> = {};
      bajas.forEach((b: any) => {
        if (!bajasMap[b.email]) bajasMap[b.email] = [];
        bajasMap[b.email].push(b.fecha);
      });

      return res.status(200).json(bajasMap);
    }

    return res.status(405).end(); // Method Not Allowed
  } catch (error) {
    console.error('[ERROR EN /api/bajas]:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
