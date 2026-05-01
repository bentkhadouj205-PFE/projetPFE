import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const sendActivationEmail = async (to, firstName, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/verification-success?token=${token}`;

  const msg = {
    to,
    from: 'noreply@resend.dev', // Replace with your verified sender
    subject: 'Vérification de votre compte - Baladiya',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Baladiya Digital</h2>
        <p>Bonjour <strong>${firstName}</strong>,</p>
        <p>Félicitations ! Votre demande d'inscription a été validée par nos services.</p>
        <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Activer mon compte</a>
        </div>
        <p style="color: #666; font-size: 14px;">Si le bouton ne fonctionne pas, copiez ce lien :<br>${verificationLink}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Baladiya - Support Municipal</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Activation email sent to ${to}`);
  } catch (error) {
    console.error('❌ SendGrid Error (Activation):', error.message);
    if (error.response) console.error(error.response.body);
    throw error;
  }
};

export default sendActivationEmail;
