import type { NextApiRequest, NextApiResponse } from 'next';
import { enviarMailYRegistrar, sleep, DELAY_ENTRE_MAILS_MS } from '@/lib/mailer';

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

  // Secuencial + pausa: en paralelo Gmail corta la conexión.
  for (const dest of destinatarios) {
    const estado = await enviarMailYRegistrar({
      to: dest.email,
      nombre: dest.nombre,
      asunto,
      html: buildHtml(dest.nombre, mensaje),
    });
    if (estado === 'enviado') {
      enviados++;
    } else {
      errores.push({ email: dest.email, error: 'Ver detalle en Mails Enviados' });
    }
    await sleep(DELAY_ENTRE_MAILS_MS);
  }

  return res.status(200).json({ enviados, fallidos: errores.length, errores } as EnviarResult);
}
