import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const sendRejectionEmail = async (to, firstName, reason) => {
  const msg = {
    to,
    from: 'noreply@resend.dev', // Replace with your verified sender
    subject: 'Demande d\'inscription rejetée - Baladiya',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ef4444;">Baladiya Digital</h2>
        <p>Bonjour <strong>${firstName}</strong>,</p>
        <p>Nous regrettons de vous informer que votre demande d'inscription a été rejetée.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Raison du rejet :</strong> ${reason}</p>
        </div>
        <p>Veuillez vérifier vos informations et soumettre une nouvelle demande.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Baladiya - Support Municipal</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`❌ Rejection email sent to ${to}`);
  } catch (error) {
    console.error('❌ SendGrid Error (Rejection):', error.message);
    if (error.response) console.error(error.response.body);
    throw error;
  }
};

export default sendRejectionEmail;
