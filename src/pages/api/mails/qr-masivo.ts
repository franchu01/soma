// pages/api/mails/qr-masivo.ts — Envío único del QR a todos los usuarios.
//
// POST /api/mails/qr-masivo?token=...&dryRun=1     → simula, no envía nada
// POST /api/mails/qr-masivo?token=...              → envía de verdad
//
// Parámetros (query):
//   dryRun=1       simula: devuelve a quiénes se enviaría, sin mandar nada
//   incluirBajas=1 incluye también a los usuarios dados de baja (default: no)
//   limit=N        procesa como mucho N usuarios en esta llamada (default 500)
//
// Es IDEMPOTENTE: saltea a quien ya recibió el mail de QR (según la tabla
// mails_enviados), así se puede reejecutar sin duplicar envíos y se puede
// llamar por tandas si el hosting corta por timeout.
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { ensureQrToken, qrPngBuffer } from '@/lib/qr';
import {
  transporter, FROM, ASUNTO_QR, qrMailHtml, qrAttachment,
  ensureMailsTable, logMail, emailValido,
} from '@/lib/mailer';

const ENVIO_HABILITADO = process.env.ENVIAR_QR_POR_MAIL === 'true';

// Pausa entre envíos: Gmail throttlea si se le tiran muchos seguidos.
const DELAY_MS = 400;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Fila = { name: string; email: string; qr_token: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Endpoint peligroso (manda mails a toda la base): exige token siempre.
  // Falla cerrado — sin CRON_TOKEN configurado no se ejecuta.
  const token = req.headers['x-cron-token'] ?? req.query.token;
  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = !!req.query.dryRun;
  const incluirBajas = !!req.query.incluirBajas;
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 500));

  try {
    await ensureQrToken();
    await ensureMailsTable();

    // Candidatos: usuarios que todavía no recibieron el mail de QR.
    const { rows } = await pool.query<Fila>(
      `SELECT u.name, u.email, u.qr_token
         FROM usuarios u
        WHERE NOT EXISTS (
                SELECT 1 FROM mails_enviados m
                 WHERE m.email = u.email
                   AND m.asunto = $1
                   AND m.estado = 'enviado'
              )
          ${incluirBajas ? '' : 'AND NOT EXISTS (SELECT 1 FROM bajas b WHERE b.email = u.email)'}
        ORDER BY u.name`,
      [ASUNTO_QR]
    );

    const invalidos = rows.filter(u => !emailValido(u.email));
    const destinatarios = rows.filter(u => emailValido(u.email)).slice(0, limit);

    if (dryRun) {
      return res.status(200).json({
        dryRun: true,
        envioHabilitado: ENVIO_HABILITADO,
        pendientes: rows.length,
        seEnviarianAhora: destinatarios.length,
        restantesLuegoDeEstaTanda: Math.max(0, rows.length - invalidos.length - destinatarios.length),
        emailsInvalidosSalteados: invalidos.map(u => `${u.name} <${u.email}>`),
        muestra: destinatarios.slice(0, 10).map(u => `${u.name} <${u.email}>`),
      });
    }

    if (!ENVIO_HABILITADO) {
      return res.status(409).json({
        error: 'Envío deshabilitado: falta ENVIAR_QR_POR_MAIL=true en el entorno.',
      });
    }

    let enviados = 0;
    const errores: { email: string; detalle: string }[] = [];

    // Secuencial a propósito: en paralelo Gmail corta la conexión.
    for (const u of destinatarios) {
      try {
        const png = await qrPngBuffer(u.qr_token);
        await transporter.sendMail({
          from: FROM,
          to: u.email,
          subject: ASUNTO_QR,
          html: qrMailHtml(u.name),
          attachments: [qrAttachment(png)],
        });
        await logMail(u.email, u.name, ASUNTO_QR, 'enviado');
        enviados++;
      } catch (err: any) {
        const detalle = err?.message ?? 'Error desconocido';
        await logMail(u.email, u.name, ASUNTO_QR, 'error', detalle);
        errores.push({ email: u.email, detalle });
      }
      await sleep(DELAY_MS);
    }

    return res.status(200).json({
      enviados,
      fallidos: errores.length,
      emailsInvalidosSalteados: invalidos.length,
      restantes: Math.max(0, rows.length - invalidos.length - destinatarios.length),
      errores,
    });
  } catch (err: any) {
    console.error('API /mails/qr-masivo error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
