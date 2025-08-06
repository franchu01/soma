// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    const stmt = db.prepare('SELECT * FROM usuarios');
    const usuarios = stmt.all();
    return res.status(200).json(usuarios);
  }

  if (method === 'POST') {
  const { name, email, recordatorio, sede } = req.body;

  if (!name || !email || !recordatorio || !sede) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  // Verificar si ya existe el email
  const existeEmail = db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email);
  if (existeEmail) {
    return res.status(409).json({ error: 'Este email ya está registrado' });
  }

  // Verificar si ya existe el mismo nombre
  const existeNombre = db.prepare('SELECT 1 FROM usuarios WHERE name = ?').get(name);
  if (existeNombre) {
    return res.status(409).json({ error: 'Este nombre y apellido ya está registrado' });
  }

  const created_at = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO usuarios (email, name, created_at, recordatorio, sede)
    VALUES (?, ?, ?, ?, ?)
  `).run(email, name, created_at, recordatorio, sede); // <--- Agregado el campo `sede`

  return res.status(200).json({ success: true });
}


  if (method === 'DELETE') {
    const { email } = req.body;
    db.prepare('DELETE FROM usuarios WHERE email = ?').run(email);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
