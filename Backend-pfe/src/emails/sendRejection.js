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

export const sendRejectionEmail = async (toEmail, prenom, reason) => {
  console.log(' [EMAIL] Generating Rejection Email...');

  const mailOptions = {
    from: `"Baladiya Digital" <${process.env.BREVO_SMTP_USER || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Refus de votre demande d\'inscription - Baladiya Digital',
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #E53E3E;">Baladiya Digital</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Nous sommes désolés, mais votre demande d'inscription a été <strong>refusée</strong> par nos services.</p>
        
        <div style="background-color: #FFF5F5; padding: 15px; border-left: 4px solid #E53E3E; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #C53030;">Motif du refus :</h4>
          <p style="margin-bottom: 0; color: #4A5568;">${reason}</p>
        </div>

        <p style="color: #4A5568;">Vous pouvez soumettre une nouvelle demande en vous assurant que toutes les informations et documents fournis sont corrects et lisibles.</p>
        
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;"/>
        <p style="color: #aaa; font-size: 11px; text-align: center;">
          © 2026 Baladiya - Support Municipal
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(` ✅ Rejection email sent to ${toEmail} (ID: ${info.messageId})`);
  } catch (error) {
    console.error(' Email Error (Rejection):', error.message);
    throw error;
  }
};

export default sendRejectionEmail;
