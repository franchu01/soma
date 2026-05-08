// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

// Asegura que todas las FK sobre usuarios.email tengan ON UPDATE CASCADE.
// Idempotente: solo altera las constraints que aún no tienen CASCADE.
async function ensureCascadeConstraints() {
  await pool.query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT conname, conrelid::regclass AS tabla
        FROM pg_constraint
        WHERE confrelid = 'usuarios'::regclass
          AND contype = 'f'
          AND confupdtype != 'c'   -- 'c' = CASCADE; si ya es CASCADE no hace nada
      LOOP
        EXECUTE format(
          'ALTER TABLE %s DROP CONSTRAINT %I',
          r.tabla, r.conname
        );
        EXECUTE format(
          'ALTER TABLE %s ADD CONSTRAINT %I
           FOREIGN KEY (email) REFERENCES usuarios(email)
           ON UPDATE CASCADE ON DELETE CASCADE',
          r.tabla, r.conname
        );
      END LOOP;
    END $$;
  `);
}

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

    if (method === 'PUT') {
      const { emailOriginal, name, email, recordatorio, sede } = req.body as {
        emailOriginal?: string;
        name?: string;
        email?: string;
        recordatorio?: number | string;
        sede?: string;
      };

      if (!emailOriginal || !name || !email || recordatorio === undefined || !sede) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Normalizo tipos
      const recNum = Number(recordatorio);
      if (!Number.isInteger(recNum) || recNum < 1 || recNum > 31) {
        return res.status(400).json({ error: 'recordatorio debe ser un entero (1-31)' });
      }

      // Verificar que el usuario original existe
      const userExists = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [emailOriginal]);
      if (userExists.rowCount === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Si se cambió el email, verificar que el nuevo no esté en uso
      if (email !== emailOriginal) {
        const emailExists = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
        if (emailExists.rowCount! > 0) {
          return res.status(409).json({ error: 'Este email ya está registrado' });
        }
      }

      // Verificar que el nombre no esté en uso por otro usuario
      const nameExists = await pool.query('SELECT 1 FROM usuarios WHERE name = $1 AND email != $2', [name, emailOriginal]);
      if (nameExists.rowCount! > 0) {
        return res.status(409).json({ error: 'Este nombre ya está registrado' });
      }

      // Garantizar CASCADE antes de cambiar el email
      if (email !== emailOriginal) {
        await ensureCascadeConstraints();
      }

      // Con ON UPDATE CASCADE la BD propaga el nuevo email a pagos, bajas y presentes
      await pool.query(
        `UPDATE usuarios
         SET email = $1, name = $2, recordatorio = $3, sede = $4
         WHERE email = $5`,
        [email, name, recNum, sede, emailOriginal]
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
