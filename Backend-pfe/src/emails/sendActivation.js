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

export const sendActivationEmail = async (toEmail, prenom, token) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const activationLink = `${frontendUrl}/?token=${token}`;

  console.log(' [EMAIL] Generating Activation Link...');
  console.log(` Link: ${activationLink}`);

  const mailOptions = {
    from: `"Baladiya Digital" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Activation de votre compte Baladiya Digital',
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #1D9E75;">Baladiya Digital</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Votre demande d'inscription a été <strong>validée</strong> par nos services.</p>
        <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}" style="
            display: inline-block;
            background: #1D9E75; color: white; padding: 12px 28px;
            border-radius: 8px; text-decoration: none; font-weight: 600;
            font-size: 15px;
          ">Activer mon compte</a>
        </div>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">
          Si le bouton ne fonctionne pas, copiez ce lien :<br/>
          <a href="${activationLink}" style="color: #1D9E75;">${activationLink}</a>
        </p>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;"/>
        <p style="color: #aaa; font-size: 11px; text-align: center;">
          © 2026 Baladiya - Support Municipal
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(` Activation email sent to ${toEmail} (ID: ${info.messageId})`);
  } catch (error) {
    console.error(' Email Error (Activation):', error.message);
    throw error;
  }
};

export default sendActivationEmail;
