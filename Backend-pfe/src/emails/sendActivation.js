// Using global fetch (Node 18+)


export const sendActivationEmail = async (toEmail, prenom, token) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const activationLink = `${frontendUrl}/?token=${token}`;

  console.log('[EMAIL] Generating Activation Link...');
  console.log(` Link: ${activationLink}`);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Baladiya Digital', email: 'baladiyadigital27@gmail.com' },
      to: [{ email: toEmail, name: prenom }],
      subject: 'Activation de votre compte Baladiya Digital',
      htmlContent: `
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
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Email Error (Activation):', data);
    throw new Error(data.message || 'Failed to send email');
  }

  console.log(`Activation email sent to ${toEmail} (ID: ${data.messageId})`);
};

export default sendActivationEmail;
