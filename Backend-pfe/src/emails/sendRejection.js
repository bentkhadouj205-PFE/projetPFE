import fetch from 'node-fetch';

export const sendRejectionEmail = async (toEmail, prenom, reason) => {
  console.log('[EMAIL] Generating Rejection Email...');

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
      subject: "Refus de votre demande d'inscription - Baladiya Digital",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
          <meta charset="UTF-8">
          <h2 style="color: #E53E3E;">Baladiya Digital</h2>
          <p>Bonjour <strong>${prenom}</strong>,</p>
          <p>Nous sommes desoles de vous informer que votre demande d'inscription a ete <strong>refusee</strong> par nos services.</p>
          <div style="background-color: #FFF5F5; padding: 15px; border-left: 4px solid #E53E3E; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #C53030;">Motif du refus :</h4>
            <p style="margin-bottom: 0; color: #4A5568;">${reason}</p>
          </div>
          <p style="color: #4A5568;">Nous vous invitons a <strong>refaire votre demande d'inscription</strong> en veillant a :</p>
          <ul style="color: #4A5568;">
            <li>Verifier que toutes vos informations personnelles sont correctes</li>
            <li>Vous assurer que vos documents (CNI, photo) sont lisibles et valides</li>
            <li>Corriger les erreurs mentionnees ci-dessus</li>
          </ul>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;"/>
          <p style="color: #aaa; font-size: 11px; text-align: center;">© 2026 Baladiya - Support Municipal</p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Email Error (Rejection):', data);
    throw new Error(data.message || 'Failed to send rejection email');
  }
  console.log(`Rejection email sent to ${toEmail}`);
};

export default sendRejectionEmail;
