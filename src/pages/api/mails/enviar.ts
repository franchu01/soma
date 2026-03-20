import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

type Destinatario = { email: string; nombre: string };

export type EnviarPayload = {
  destinatarios: Destinatario[];
  asunto: string;
  mensaje: string; // plain text; we'll wrap it in HTML
};

export type EnviarResult = {
  enviados: number;
  fallidos: number;
  errores: { email: string; error: string }[];
};

function buildHtml(nombre: string, mensaje: string): string {
  // Convert newlines to <br> for HTML
  const cuerpo = mensaje.replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <p>Hola ${nombre},</p>
      <p>${cuerpo}</p>
      <hr style="margin-top:32px"/>
      <p><small style="color:#888">Mensaje enviado desde SOMA Gym. No responder.</small></p>
    </div>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { destinatarios, asunto, mensaje } = req.body as EnviarPayload;

  if (!destinatarios?.length || !asunto?.trim() || !mensaje?.trim()) {
    return res.status(400).json({ error: 'Faltan destinatarios, asunto o mensaje' });
  }

  const errores: { email: string; error: string }[] = [];
  let enviados = 0;

  for (const dest of destinatarios) {
    let estado: 'enviado' | 'error' = 'enviado';
    let errorDetalle: string | null = null;

    try {
      await transporter.sendMail({
        from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
        to: dest.email,
        subject: asunto,
        html: buildHtml(dest.nombre, mensaje),
      });
      enviados++;
    } catch (err: any) {
      estado = 'error';
      errorDetalle = err?.message ?? 'Error desconocido';
      errores.push({ email: dest.email, error: errorDetalle! });
    }

    // Log every attempt
    try {
      await pool.query(
        `INSERT INTO mails_enviados (email, nombre, asunto, estado, error_detalle)
         VALUES ($1, $2, $3, $4, $5)`,
        [dest.email, dest.nombre, asunto, estado, errorDetalle]
      );
    } catch (logErr) {
      console.error('[enviar] Error al loguear:', logErr);
    }
  }

  return res.status(200).json({ enviados, fallidos: errores.length, errores } as EnviarResult);
}
