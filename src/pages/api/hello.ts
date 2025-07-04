// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { iniciarRecordatorioDiario } from '@/cron/recordatorios';
type Data = {
  name: string;
};

// Solo se ejecuta una vez porque Node cachea los módulos
iniciarRecordatorioDiario();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  res.status(200).json({ name: "John Doe" });
}


