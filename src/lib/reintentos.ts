// lib/reintentos.ts — Cola de reintentos para los mails "automáticos" (los
// que se disparan solos, sin que haya una persona mirando el resultado):
// recordatorio mensual y bienvenida/reactivación. El recordatorio de deuda
// queda afuera a propósito: ese cron ya reintenta todos los días mientras
// el usuario siga debiendo (ver cron/recordatorio-deuda.ts), lo cual es
// mejor que un tope de intentos para ese caso — no tiene sentido dejar de
// insistir a los N intentos si todavía no pagó.
//
// Backoff exponencial en DÍAS (1 → 2 → 4 → 8, tope MAX_INTENTOS intentos)
// porque los cron jobs de Vercel en el plan gratuito corren como mínimo una
// vez por día: no hay forma de reintentar en minutos/horas sin otro
// disparador (Vercel Pro, o un servicio externo). procesarColaReintentos()
// se llama al final de cron/recordatorio-deuda.ts (que ya corre a diario),
// así no hace falta un cron nuevo en vercel.json.
import pool from '@/lib/db';
import { getQrTokenByEmail, qrPngBuffer } from '@/lib/qr';
import {
  recordatorioMailHtml, bienvenidaMailHtml, qrAttachment,
  ASUNTO_BIENVENIDA, ASUNTO_REACTIVACION,
  enviarMailYRegistrar, ensureMailsTable, logMail, sleep, DELAY_ENTRE_MAILS_MS,
} from '@/lib/mailer';

export type TipoMailAutomatico = 'recordatorio' | 'bienvenida' | 'reactivacion';

const MAX_INTENTOS = 5; // 1 inicial + hasta 4 reintentos en cola (~15 días en total)

let colaAsegurada = false;
async function ensureColaTable() {
  if (colaAsegurada) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mails_pendientes (
      id              SERIAL PRIMARY KEY,
      email           VARCHAR NOT NULL,
      tipo            VARCHAR(20) NOT NULL,
      intentos        INT NOT NULL DEFAULT 1,
      proximo_intento TIMESTAMPTZ NOT NULL,
      creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(email, tipo)
    )
  `);
  colaAsegurada = true;
}

// Se llama cuando un mail automático falla incluso después del reintento
// inmediato de enviarMailYRegistrar: programa un reintento para mañana.
export async function encolarReintento(email: string, tipo: TipoMailAutomatico) {
  await ensureColaTable();
  await pool.query(
    `INSERT INTO mails_pendientes (email, tipo, intentos, proximo_intento)
     VALUES ($1, $2, 1, NOW() + INTERVAL '1 day')
     ON CONFLICT (email, tipo) DO UPDATE SET proximo_intento = NOW() + INTERVAL '1 day'`,
    [email, tipo]
  );
}

// Se llama cuando un envío de ese tipo sale bien (desde el flujo normal o
// desde la cola): si había un reintento pendiente, ya no hace falta.
export async function resolverReintento(email: string, tipo: TipoMailAutomatico) {
  await ensureColaTable();
  await pool.query(`DELETE FROM mails_pendientes WHERE email = $1 AND tipo = $2`, [email, tipo]);
}

function hoyBuenosAires(): { dia: number; mes: string } {
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { dia: Number(get('day')), mes: `${get('year')}-${get('month')}` };
}

const ASUNTO_RECORDATORIO = '💪 Recordatorio de pago de gimnasio';

// Reintenta todo lo que esté vencido en la cola. Antes de reenviar un
// recordatorio mensual, chequea que siga siendo válido (no pagó / no está
// de baja) — si ya no aplica, lo saca de la cola sin mandar nada.
export async function procesarColaReintentos() {
  await ensureColaTable();

  const { rows: pendientes } = await pool.query<{
    id: number; email: string; tipo: TipoMailAutomatico; intentos: number;
  }>(`SELECT id, email, tipo, intentos FROM mails_pendientes WHERE proximo_intento <= NOW() ORDER BY proximo_intento ASC`);

  const { dia, mes } = hoyBuenosAires();
  let reenviados = 0, reprogramados = 0, abandonados = 0, yaNoAplica = 0;

  for (const p of pendientes) {
    const { rows } = await pool.query<{ name: string; qr_token: string | null }>(
      'SELECT name, qr_token FROM usuarios WHERE email = $1',
      [p.email]
    );
    const usuario = rows[0];
    if (!usuario) {
      await resolverReintento(p.email, p.tipo);
      yaNoAplica++;
      continue;
    }

    if (p.tipo === 'recordatorio') {
      const [{ rows: pagoRows }, { rows: bajaRows }] = await Promise.all([
        pool.query('SELECT 1 FROM pagos WHERE email = $1 AND fecha LIKE $2', [p.email, `${mes}%`]),
        pool.query('SELECT 1 FROM bajas WHERE email = $1', [p.email]),
      ]);
      if (pagoRows.length > 0 || bajaRows.length > 0) {
        // Ya pagó o se dio de baja desde que falló el envío original.
        await resolverReintento(p.email, p.tipo);
        yaNoAplica++;
        continue;
      }
    }

    if (!usuario.qr_token) {
      await resolverReintento(p.email, p.tipo);
      yaNoAplica++;
      continue;
    }
    const png = await qrPngBuffer(usuario.qr_token);

    const estado = p.tipo === 'recordatorio'
      ? await enviarMailYRegistrar({
          to: p.email,
          nombre: usuario.name,
          asunto: ASUNTO_RECORDATORIO,
          html: recordatorioMailHtml(usuario.name, dia, true),
          attachments: [qrAttachment(png)],
        })
      : await enviarMailYRegistrar({
          to: p.email,
          nombre: usuario.name,
          asunto: p.tipo === 'reactivacion' ? ASUNTO_REACTIVACION : ASUNTO_BIENVENIDA,
          html: bienvenidaMailHtml(usuario.name, p.tipo === 'reactivacion'),
          attachments: [qrAttachment(png)],
        });

    if (estado === 'enviado') {
      await resolverReintento(p.email, p.tipo);
      reenviados++;
    } else if (p.intentos + 1 >= MAX_INTENTOS) {
      // Se agotaron los intentos: queda el último error en mails_enviados
      // (ya logueado por enviarMailYRegistrar) para reenvío manual.
      await pool.query('DELETE FROM mails_pendientes WHERE id = $1', [p.id]);
      abandonados++;
    } else {
      const delayDias = Math.min(2 ** p.intentos, 8);
      await pool.query(
        `UPDATE mails_pendientes SET intentos = intentos + 1, proximo_intento = NOW() + ($2 || ' days')::interval WHERE id = $1`,
        [p.id, delayDias]
      );
      reprogramados++;
    }
    await sleep(DELAY_ENTRE_MAILS_MS);
  }

  return { procesados: pendientes.length, reenviados, reprogramados, abandonados, yaNoAplica };
}

// Envía el mail de bienvenida con el QR. Pensado para llamarse desde el alta
// y la reactivación: NUNCA lanza ni bloquea la operación principal — si el
// mail falla (incluso tras el reintento inmediato), queda encolado para
// reintentarse automáticamente los próximos días.
export async function enviarQrBienvenida(
  email: string,
  nombre: string,
  esReactivacion = false
): Promise<void> {
  if (process.env.ENVIAR_QR_POR_MAIL !== 'true') return;

  const asunto = esReactivacion ? ASUNTO_REACTIVACION : ASUNTO_BIENVENIDA;
  const tipo: TipoMailAutomatico = esReactivacion ? 'reactivacion' : 'bienvenida';

  try {
    const token = await getQrTokenByEmail(email);
    if (!token) {
      await ensureMailsTable();
      await logMail(email, nombre, asunto, 'error', 'Usuario sin código QR asignado');
      return;
    }
    const png = await qrPngBuffer(token);

    const estado = await enviarMailYRegistrar({
      to: email,
      nombre,
      asunto,
      html: bienvenidaMailHtml(nombre, esReactivacion),
      attachments: [qrAttachment(png)],
    });

    if (estado === 'enviado') await resolverReintento(email, tipo);
    else await encolarReintento(email, tipo);
  } catch (err: unknown) {
    // Solo falla acá la generación del QR (el envío ya se loguea solo).
    const detalle = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[mailer] Error preparando bienvenida para ${email}:`, detalle);
    try {
      await ensureMailsTable();
      await logMail(email, nombre, asunto, 'error', detalle);
    } catch { /* el log es best-effort */ }
  }
}
