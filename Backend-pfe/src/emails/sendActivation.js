import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendActivationEmail = async (toEmail, prenom, token) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const activationLink = `${frontendUrl}/?token=${token}`;

  console.log(' [EMAIL] Generating Activation Link...');
  console.log(` Link: ${activationLink}`);

  // 🧪 For demo purposes on Render's free tier, always send to the verified dev email in production
  const recipient = process.env.NODE_ENV === 'production' 
    ? 'bentalebkhadouj39@gmail.com' 
    : toEmail;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Baladiya Digital <onboarding@resend.dev>',
      to: recipient,
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
    });

    if (error) {
      console.error(' [RESEND] API Error:', error);
      throw error;
    }

    console.log(` ✅ Activation email sent to ${recipient} (ID: ${data?.id})`);
  } catch (error) {
    console.error(' Email Error (Activation):', error.message);
    throw error;
  }
};

export default sendActivationEmail;
