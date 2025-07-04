import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    type Pago = {
        email: string;
        fecha: string;
    };

    const pagos = db.prepare('SELECT * FROM pagos').all() as Pago[];


    // Agrupar pagos por email
    const pagosMap: Record<string, string[]> = {};
    pagos.forEach(p => {
      if (!pagosMap[p.email]) pagosMap[p.email] = [];
      pagosMap[p.email].push(p.fecha);
    });

    res.status(200).json(pagosMap);
  }

  if (req.method === 'POST') {
    const { email, fecha } = req.body;
    const fechaUso = fecha || new Date().toISOString().slice(0, 7); // Da '2025-07'

    db.prepare('INSERT INTO pagos (email, fecha) VALUES (?, ?)').run(email, fechaUso);
    res.status(200).json({ success: true });
  }
}
