import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER || process.env.SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS,
  },
});

export const sendActivationEmail = async (toEmail, prenom, token) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const activationLink = `${frontendUrl}/?token=${token}`;

  console.log(' [EMAIL] Generating Activation Link...');
  console.log(` Link: ${activationLink}`);

  const mailOptions = {
    from: `"Baladiya Digital" <${process.env.BREVO_SMTP_USER || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Activation de votre compte Baladiya Digital',
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #1D9E75;">Baladiya Digital</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Votre demande a ete validee par nos services.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}" style="display: inline-block; background: #1D9E75; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Activer mon compte</a>
        </div>
        <p style="color: #888; font-size: 12px;">Si le bouton ne fonctionne pas: <a href="${activationLink}">${activationLink}</a></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(` ✅ Activation email sent to ${toEmail} (ID: ${info.messageId})`);
  } catch (error) {
    console.error(' Email Error (Activation):', error.message);
    throw error;
  }
};

export default sendActivationEmail;
