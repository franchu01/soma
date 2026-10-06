// lib/mailer.ts — Transporter, logging y contenido compartido de los mails.
// Centraliza el texto del mail de QR para que el envío masivo, el reenvío
// individual y el recordatorio mensual digan siempre lo mismo.
import nodemailer from 'nodemailer';
import dns from 'dns';
import pool from '@/lib/db';

// pool + maxConnections:1 fuerza a nodemailer a reusar una única conexión
// SMTP y a encolar internamente los envíos en vez de abrir logins en
// paralelo — Gmail corta ("too many simultaneous connections"/login
// attempts) cuando detecta varias conexiones a la vez desde la misma cuenta.
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 1,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

export const FROM = `"SOMA Gym" <${process.env.EMAIL_FROM}>`;

export const ASUNTO_QR = '🎫 Tu código QR de acceso - SOMA Gym';
export const ASUNTO_BIENVENIDA = '🎉 ¡Bienvenido a SOMA! Este es tu código QR';
export const ASUNTO_REACTIVACION = '🎉 ¡Bienvenido de vuelta a SOMA! Este es tu código QR';
export const ASUNTO_DEUDA = '⏰ Cuota de SOMA pendiente de pago';

// Content-ID con el que se referencia el QR embebido desde el HTML.
export const QR_CID = 'qr-soma';

// Pausa entre envíos secuenciales (recordatorios/masivos): sumado al pool de
// una sola conexión, evita que Gmail nos throttlee por mandar muy seguido.
export const DELAY_ENTRE_MAILS_MS = 400;

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Filtro mínimo de formato (la base tiene algunas cargadas a mano tipo
// "gmail" sin TLD, que sólo generan rebotes). No garantiza que el buzón
// exista: para eso ver tieneDominioValido más abajo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function emailValido(email: string | null | undefined): boolean {
  return !!email && EMAIL_RE.test(email.trim());
}

// Verifica que el DOMINIO del email tenga registros MX (es decir, que pueda
// recibir correo). No confirma que la casilla puntual exista — eso requiere
// un probe SMTP real, que la mayoría de los proveedores bloquea o falsea —
// pero descarta dominios inventados o mal tipeados ("@gmial.com",
// "@hotmial.com") antes de gastar una conexión y generar un rebote, que es
// justamente lo que daña la reputación de la cuenta de envío.
const mxCache = new Map<string, boolean>();

export async function tieneDominioValido(email: string): Promise<boolean> {
  const dominio = email.split('@')[1]?.toLowerCase().trim();
  if (!dominio) return false;

  const cacheado = mxCache.get(dominio);
  if (cacheado !== undefined) return cacheado;

  try {
    const registros = await dns.promises.resolveMx(dominio);
    const valido = registros.length > 0;
    mxCache.set(dominio, valido);
    return valido;
  } catch {
    // ENOTFOUND / ENODATA: el dominio no existe o no recibe mail.
    mxCache.set(dominio, false);
    return false;
  }
}

let tablaAsegurada = false;

export async function ensureMailsTable() {
  if (tablaAsegurada) return;
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
  tablaAsegurada = true;
}

// Registra el intento de envío. Nunca lanza: perder el log no debe abortar
// un envío que ya salió.
export async function logMail(
  email: string,
  nombre: string,
  asunto: string,
  estado: 'enviado' | 'error',
  errorDetalle: string | null = null
) {
  try {
    await pool.query(
      `INSERT INTO mails_enviados (email, nombre, asunto, estado, error_detalle)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, nombre, asunto, estado, errorDetalle]
    );
  } catch (err) {
    console.error('[mailer] Error al loguear mail:', err);
  }
}

type AdjuntoMail = ReturnType<typeof qrAttachment>;

type OpcionesEnvio = {
  to: string;
  nombre: string;
  asunto: string;
  html: string;
  attachments?: AdjuntoMail[];
};

async function intentarEnviar(opts: OpcionesEnvio): Promise<{ ok: true } | { ok: false; detalle: string }> {
  try {
    const info = await transporter.sendMail({
      from: FROM,
      to: opts.to,
      subject: opts.asunto,
      html: opts.html,
      attachments: opts.attachments,
    });
    // sendMail() puede resolver sin lanzar aunque el servidor haya
    // rechazado al destinatario (queda en `rejected` en vez de `accepted`);
    // sin este chequeo lo contábamos como enviado igual.
    if (info.rejected && info.rejected.length > 0) {
      return { ok: false, detalle: `Rechazado por el servidor de correo: ${info.rejected.join(', ')}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, detalle: err instanceof Error ? err.message : 'Error desconocido' };
  }
}

// Punto único de envío real: valida formato + dominio (MX), manda el mail,
// reintenta una vez si falla (las fallas de Gmail suelen ser throttling
// transitorio) y siempre deja registro en mails_enviados. Nunca lanza.
export async function enviarMailYRegistrar(opts: OpcionesEnvio): Promise<'enviado' | 'error'> {
  await ensureMailsTable();

  if (!emailValido(opts.to)) {
    await logMail(opts.to, opts.nombre, opts.asunto, 'error', 'Formato de email inválido');
    return 'error';
  }

  if (!(await tieneDominioValido(opts.to))) {
    await logMail(opts.to, opts.nombre, opts.asunto, 'error', 'El dominio del email no existe o no recibe correo (sin registros MX)');
    return 'error';
  }

  let resultado = await intentarEnviar(opts);
  if (!resultado.ok) {
    await sleep(2000);
    resultado = await intentarEnviar(opts); // un reintento: suele alcanzar para throttling pasajero
  }

  await logMail(opts.to, opts.nombre, opts.asunto, resultado.ok ? 'enviado' : 'error', resultado.ok ? null : resultado.detalle);
  return resultado.ok ? 'enviado' : 'error';
}

export function qrAttachment(png: Buffer) {
  return {
    filename: 'qr-soma.png',
    content: png,
    contentType: 'image/png',
    cid: QR_CID,
  };
}

// Bloque con el QR embebido, reutilizable dentro de cualquier mail.
export function bloqueQr(): string {
  return `<p style="text-align:center;margin:24px 0">
    <img src="cid:${QR_CID}" alt="Tu código QR" width="220" height="220" style="border:1px solid #e2e8f0;border-radius:12px;padding:8px;background:#fff"/>
  </p>`;
}

const FIRMA = `
  <hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0"/>
  <p><small style="color:#888">Mensaje enviado desde SOMA Gym. No responder.</small></p>
`;

// Mail de presentación del QR (envío masivo inicial y reenvíos individuales).
export function qrMailHtml(nombre: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6">
      <p>¡Hola ${nombre}! 👋</p>
      <p>Estrenamos sistema de ingreso en SOMA: desde ahora entrás con <strong>tu código QR personal</strong>.</p>
      ${bloqueQr()}
      <p><strong>Acordate de llevarlo todos los días.</strong> Guardalo en tu teléfono y mostralo en recepción cada vez que vengas a entrenar — con eso registramos tu asistencia al instante, sin planillas ni esperas.</p>
      <p>También te lo dejamos adjunto a este mail para que lo tengas siempre a mano. Si preferís, sacale una captura y guardala en tus favoritos 📱</p>
      <p>Es personal e intransferible. Si lo perdés o te lo borrás, escribinos y te lo reenviamos sin problema.</p>
      <p>¡Nos vemos en el gym! 🏋️</p>
      ${FIRMA}
    </div>
  `;
}

// Mail de bienvenida con el QR: se manda al dar de alta un usuario nuevo y
// al reactivar a uno que estaba de baja.
export function bienvenidaMailHtml(nombre: string, esReactivacion: boolean): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6">
      <p>${esReactivacion ? `¡Qué bueno tenerte de vuelta, ${nombre}! 💪` : `¡Hola ${nombre}, bienvenido a SOMA! 👋`}</p>
      <p>${esReactivacion
        ? 'Reactivamos tu cuenta, así que ya podés volver a entrenar con nosotros.'
        : 'Ya estás registrado y podés empezar a entrenar cuando quieras.'}</p>
      <p>Este es <strong>tu código QR personal de acceso</strong>:</p>
      ${bloqueQr()}
      <p><strong>Acordate de llevarlo todos los días.</strong> Guardalo en tu teléfono y mostralo en recepción cada vez que vengas — con eso registramos tu asistencia al instante.</p>
      <p>También te lo dejamos adjunto para que lo tengas siempre a mano. Es personal e intransferible; si lo perdés, escribinos y te lo reenviamos.</p>
      <p>¡Nos vemos en el gym! 🏋️</p>
      ${FIRMA}
    </div>
  `;
}

// enviarQrBienvenida() vive en lib/reintentos.ts (necesita encolar
// reintentos ahí, e importar desde este archivo crearía un ciclo).

// Recordatorio mensual de pago, ahora con el QR adjunto para tenerlo a mano.
// `conQr` en false omite el bloque de la imagen (si no se pudo generar el QR,
// incluirlo dejaría una imagen rota en el mail).
export function recordatorioMailHtml(nombre: string, dia: number, conQr: boolean): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6">
      <p>Hola ${nombre},</p>
      <p>Hoy es día ${dia} del mes.</p>
      <p>No olvides abonar tu mensualidad del gimnasio 💸.</p>
      <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
      ${conQr ? `
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
      <p>Te dejamos también <strong>tu código QR de acceso</strong>, para que lo tengas siempre a mano y no te olvides de llevarlo:</p>
      ${bloqueQr()}` : ''}
      ${FIRMA}
    </div>
  `;
}

// Recordatorio de deuda: se reenvía cada 5 días mientras la cuota siga
// pendiente (ver cron/recordatorio-deuda.ts). Texto pedido por el gimnasio.
export function deudaMailHtml(nombre: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6">
      <p>Hola ${nombre}, ¿cómo estás?</p>
      <p>Te recordamos que ya venció el plazo de pago de la cuota mensual de SOMA y todavía figura pendiente.</p>
      <p>Te pedimos, por favor, que regularices el pago a la brevedad. Si ya lo realizaste, envianos el comprobante para actualizar el registro.</p>
      <p>Muchas gracias.<br/>Equipo SOMA</p>
      ${FIRMA}
    </div>
  `;
}
