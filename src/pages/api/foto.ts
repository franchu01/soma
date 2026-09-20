// pages/api/foto.ts — Guarda/borra la foto de perfil de un usuario.
// El cliente ya manda la imagen comprimida (ver src/lib/imagen.ts) como
// data URL, así que el body es chico y no hace falta parsear multipart.
import type { NextApiRequest, NextApiResponse } from 'next';
import { guardarFoto, borrarFoto } from '@/lib/foto';

const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/;
const MAX_BYTES = 2 * 1024 * 1024; // margen generoso; comprimida debería pesar <100KB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { email, dataUrl } = req.body as { email?: string; dataUrl?: string };
      if (!email || !dataUrl) return res.status(400).json({ error: 'Faltan datos' });

      const match = DATA_URL_RE.exec(dataUrl);
      if (!match) return res.status(400).json({ error: 'Formato de imagen inválido' });

      const [, contentType, base64] = match;
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > MAX_BYTES) {
        return res.status(413).json({ error: 'La imagen es demasiado pesada' });
      }

      const url = await guardarFoto(email, buffer, contentType);
      return res.status(200).json({ url });
    }

    if (req.method === 'DELETE') {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ error: 'Falta email' });

      await borrarFoto(email);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err: any) {
    console.error('API /foto error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message });
  }
}
