import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); // Fallback for safety

export class EmailService {
  static async sendActivationEmail({ to, firstName, lastName, verificationLink }) {
    try {
      console.log(`📧 RESEND: Preparing activation email for ${to}`);
      
      const { data, error } = await resend.emails.send({
        from: 'Baladiya <noreply@resend.dev>', // Note: Use resend.dev for testing if no domain verified
        to: [to],
        subject: 'Vérification de votre email - Baladiya',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white; }
              .content { padding: 30px; }
              .btn { display: inline-block; padding: 14px 32px; background: #10b981; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0">Baladiya</h1>
                <p>Vérification d'email</p>
              </div>
              <div class="content">
                <h2>Bonjour ${firstName} ${lastName},</h2>
                <p>Félicitations ! Votre inscription a été validée par nos services.</p>
                <p>Cliquez sur le bouton ci-dessous pour vérifier votre email et activer votre compte :</p>
                <div style="text-align: center;">
                  <a href="${verificationLink}" class="btn">Vérifier mon email</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 24 heures.</p>
                <p style="color: #6b7280; font-size: 12px;">Si le bouton ne fonctionne pas, copiez ce lien :<br>${verificationLink}</p>
              </div>
              <div class="footer">
                <p>© 2026 Baladiya - Tous droits réservés</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Bonjour ${firstName} ${lastName}, votre inscription a été validée. Cliquez sur ce lien pour vérifier votre email: ${verificationLink}`,
      });

      if (error) {
        console.error('❌ RESEND ERROR:', error);
        throw new Error(error.message);
      }

      console.log('✅ RESEND SUCCESS:', data.id);
      return data;
    } catch (err) {
      console.error('💥 EMAIL SERVICE FAILURE:', err);
      throw err;
    }
  }

  static async sendRejectionEmail({ to, firstName, lastName, reason }) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Baladiya <noreply@resend.dev>',
        to: [to],
        subject: 'Demande rejetée - Baladiya',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #ef4444;">Baladiya - Demande rejetée</h2>
            <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
            <p>Nous regrettons de vous informer que votre demande d'inscription a été rejetée.</p>
            <p style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <strong>Raison :</strong> ${reason || 'Les informations fournies ne correspondent pas à nos registres officiels.'}
            </p>
            <p>Veuillez vérifier vos informations et soumettre une nouvelle demande.</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">© 2026 Baladiya - Support Municipal</p>
          </div>
        `,
      });

      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      console.error('💥 REJECTION EMAIL FAILURE:', err);
      throw err;
    }
  }
}
