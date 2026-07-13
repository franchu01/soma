// lib/qr.ts
import pool from '@/lib/db';
import QRCode from 'qrcode';

// Contenido del QR: "SOMA:<uuid>". El uuid es un token aleatorio e inmutable
// por usuario (no depende del email, así el QR sigue válido si el email cambia,
// y no se puede falsificar adivinando datos del cliente).
export const QR_PREFIX = 'SOMA:';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let columnaAsegurada = false;

// Migración idempotente: agrega usuarios.qr_token con DEFAULT, así las altas
// nuevas reciben token automáticamente y los usuarios existentes se backfillean.
export async function ensureQrToken() {
  if (columnaAsegurada) return;
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS qr_token UUID UNIQUE DEFAULT gen_random_uuid()
  `);
  await pool.query(`UPDATE usuarios SET qr_token = gen_random_uuid() WHERE qr_token IS NULL`);
  columnaAsegurada = true;
}

export async function getQrTokenByEmail(email: string): Promise<string | null> {
  await ensureQrToken();
  const { rows } = await pool.query<{ qr_token: string }>(
    'SELECT qr_token FROM usuarios WHERE email = $1',
    [email]
  );
  return rows[0]?.qr_token ?? null;
}

// Extrae el token de lo escaneado; devuelve null si no es un QR de SOMA.
export function parseQrContenido(contenido: string): string | null {
  const token = contenido.startsWith(QR_PREFIX)
    ? contenido.slice(QR_PREFIX.length)
    : contenido;
  return UUID_RE.test(token.trim()) ? token.trim() : null;
}

// PNG generado on-demand (no se persiste la imagen: generarla es barato y
// evita guardar binarios o invalidar archivos viejos).
export function qrPngBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(QR_PREFIX + token, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}
