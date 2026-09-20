// lib/foto.ts — Foto de perfil de cada usuario, guardada en Vercel Blob
// (no en Postgres: son binarios y no queremos ni el peso ni el I/O extra en
// la misma DB que usan todas las API routes). En `usuarios` solo se guarda
// la URL pública que devuelve Blob.
import pool from '@/lib/db';
import { put, del } from '@vercel/blob';

let columnaAsegurada = false;

export async function ensureFotoColumn() {
  if (columnaAsegurada) return;
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT`);
  columnaAsegurada = true;
}

// Sube la foto (ya comprimida por el cliente) y actualiza el usuario.
// Si ya tenía una foto anterior, la borra de Blob para no acumular basura.
export async function guardarFoto(email: string, buffer: Buffer, contentType: string): Promise<string> {
  await ensureFotoColumn();

  const { rows } = await pool.query<{ foto_url: string | null }>(
    'SELECT foto_url FROM usuarios WHERE email = $1',
    [email]
  );
  if (rows.length === 0) throw new Error('Usuario no encontrado');
  const anterior = rows[0].foto_url;

  const ext = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : 'jpg';
  const blob = await put(`fotos/${encodeURIComponent(email)}-${Date.now()}.${ext}`, buffer, {
    access: 'public',
    contentType,
  });

  await pool.query('UPDATE usuarios SET foto_url = $1 WHERE email = $2', [blob.url, email]);

  if (anterior) {
    try { await del(anterior); } catch (err) { console.error('[foto] no se pudo borrar la foto anterior:', err); }
  }

  return blob.url;
}

export async function borrarFoto(email: string): Promise<void> {
  await ensureFotoColumn();

  const { rows } = await pool.query<{ foto_url: string | null }>(
    'SELECT foto_url FROM usuarios WHERE email = $1',
    [email]
  );
  const url = rows[0]?.foto_url ?? null;

  await pool.query('UPDATE usuarios SET foto_url = NULL WHERE email = $1', [email]);

  if (url) {
    try { await del(url); } catch (err) { console.error('[foto] no se pudo borrar la foto:', err); }
  }
}
