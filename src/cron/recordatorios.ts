// src/cron/recordatorios.ts
import cron from 'node-cron';
import db from '@/lib/db';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // o el que uses (Outlook, Yahoo, etc.)
  auth: {
    user: process.env.EMAIL_FROM, // tu email
    pass: process.env.EMAIL_PASS  // contraseña o app password
  }
});

export async function enviarRecordatorio(email: string, nombre: string, dia: number) {
  try {
    const info = await transporter.sendMail({
      from: `"SOMA Gym" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '💪 Recordatorio de pago de gimnasio',
      html: `
        <p>Hola ${nombre},</p>
        <p>Este es un recordatorio de que ya llegó el día ${dia} del mes.</p>
        <p>No olvides abonar tu mensualidad del gimnasio 💸.</p>
        <p>¡Seguimos entrenando fuerte! 🏋️‍♂️</p>
        <hr/>
        <p><small>Este es un mensaje automático. Por favor, no respondas.</small></p>
      `
    });

    console.log(`📤 Email enviado a ${email}: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Error al enviar mail a ${email}:`, err);
  }
}

export function iniciarRecordatorioDiario() {
  cron.schedule('0 9 * * *', () => {
    const hoy = new Date().getDate(); // Día actual del mes
    const stmt = db.prepare('SELECT name, email, recordatorio FROM usuarios');
    const usuarios = stmt.all();

    usuarios.forEach((u: any) => {
      if (u.recordatorio === hoy) {
        enviarRecordatorio(u.email, u.name, u.recordatorio);
      }
    });
  });

  console.log('✅ Cron de recordatorios iniciado (9:00 AM diario)');
}
