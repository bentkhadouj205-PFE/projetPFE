import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendRejectionEmail = async (toEmail, firstName, reason) => {
  const mailOptions = {
    from: `"Baladiya Digital" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Demande d\'inscription rejetée - Baladiya',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ef4444;">Baladiya Digital</h2>
        <p>Bonjour <strong>${firstName}</strong>,</p>
        <p>Nous regrettons de vous informer que votre demande d'inscription a été rejetée.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Raison du rejet :</strong> ${reason}</p>
        </div>
        <p>Veuillez vérifier vos informations et soumettre une nouvelle demande.</p>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
        <p style="color: #aaa; font-size: 11px; text-align: center;">
          © 2026 Baladiya - Support Municipal
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(` Rejection email sent to ${toEmail} (ID: ${info.messageId})`);
  } catch (error) {
    console.error(' Email Error (Rejection):', error.message);
    throw error;
  }
};

export default sendRejectionEmail;
