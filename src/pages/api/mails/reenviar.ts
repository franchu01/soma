import type { NextApiRequest, NextApiResponse } from 'next';
import { enviarMailYRegistrar } from '@/lib/mailer';

const ASUNTO = '💪 Recordatorio de pago de gimnasio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, nombre } = req.body as { email?: string; nombre?: string };
  if (!email || !nombre) {
    return res.status(400).json({ error: 'Faltan email o nombre' });
  }

  const estado = await enviarMailYRegistrar({
    to: email,
    nombre,
    asunto: `${ASUNTO} (reenvío)`,
    html: `
      <p>Hola ${nombre},</p>
      <p>Este es un recordatorio para abonar tu mensualidad del gimnasio 💸.</p>
      <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
      <hr/>
      <p><small>Mensaje automático. No responder.</small></p>
    `,
  });

  if (estado === 'error') {
    return res.status(500).json({ error: 'No se pudo enviar el mail — ver el detalle en "Mails Enviados"' });
  }
  return res.status(200).json({ success: true });
}
