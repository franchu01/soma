// pages/api/scan.ts — Resuelve un QR escaneado: identifica al usuario,
// registra el presente del día y devuelve su estado de pagos.
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { ensureQrToken, parseQrContenido } from '@/lib/qr';

type EstadoPago = 'pagado' | 'pendiente' | 'deuda';

export type ScanResult = {
  usuario: { name: string; email: string; sede: string; recordatorio: number; created_at: string };
  presente: { fecha: string; yaEstaba: boolean };
  mesActual: string;
  estadoMesActual: EstadoPago;
  mesesImpagos: string[]; // meses anteriores sin pago (YYYY-MM), más reciente primero
  deBaja: boolean;
};

// Fecha de hoy en Buenos Aires (no UTC), igual que el cron de recordatorios
function hoyBuenosAires(): { dia: number; mes: string; fecha: string } {
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const dia = Number(get('day'));
  const mes = `${get('year')}-${get('month')}`;
  return { dia, mes, fecha: `${mes}-${get('day')}` };
}

// Meses desde el alta hasta el mes anterior al actual (inclusive)
function mesesDesdeAlta(createdAt: string, mesActual: string): string[] {
  const desde = new Date(createdAt);
  let y = desde.getFullYear();
  let m = desde.getMonth() + 1;

  const meses: string[] = [];
  while (true) {
    const label = `${y}-${String(m).padStart(2, '0')}`;
    if (label >= mesActual) break;
    meses.push(label);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return meses;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { codigo } = req.body as { codigo?: string };
  if (!codigo) return res.status(400).json({ error: 'Falta el código escaneado' });

  const token = parseQrContenido(codigo);
  if (!token) {
    return res.status(400).json({ error: 'El código QR no es válido' });
  }

  try {
    await ensureQrToken();

    const { rows: usuarios } = await pool.query<{
      name: string; email: string; sede: string; recordatorio: number; created_at: string;
    }>(
      'SELECT name, email, sede, recordatorio, created_at FROM usuarios WHERE qr_token = $1',
      [token]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún cliente para este QR' });
    }
    const usuario = usuarios[0];

    const { dia, mes, fecha } = hoyBuenosAires();

    // Registrar presente; si rowCount es 0 ya estaba marcado hoy
    const insert = await pool.query(
      `INSERT INTO presentes (email, fecha) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [usuario.email, fecha]
    );
    const yaEstaba = insert.rowCount === 0;

    const [pagosRes, bajasRes] = await Promise.all([
      pool.query<{ fecha: string }>('SELECT fecha FROM pagos WHERE email = $1', [usuario.email]),
      pool.query<{ fecha: string }>('SELECT fecha FROM bajas WHERE email = $1', [usuario.email]),
    ]);
    const pagos = pagosRes.rows.map(r => r.fecha);
    const bajas = bajasRes.rows.map(r => r.fecha);

    // Mismo criterio que la lista de usuarios: pagado / pendiente (aún no vence) / deuda
    const pagoMes = pagos.some(p => p.startsWith(mes));
    const estadoMesActual: EstadoPago = pagoMes
      ? 'pagado'
      : dia >= Number(usuario.recordatorio) ? 'deuda' : 'pendiente';

    // Meses anteriores sin pago, excluyendo meses con baja registrada
    // (mismo criterio que el historial de pagos)
    const mesesImpagos = mesesDesdeAlta(usuario.created_at, mes)
      .filter(m => !pagos.some(p => p.startsWith(m)) && !bajas.some(b => b.startsWith(m)))
      .reverse();

    const result: ScanResult = {
      usuario: { ...usuario, recordatorio: Number(usuario.recordatorio) },
      presente: { fecha, yaEstaba },
      mesActual: mes,
      estadoMesActual,
      mesesImpagos,
      deBaja: bajas.length > 0,
    };
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('API /scan error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
