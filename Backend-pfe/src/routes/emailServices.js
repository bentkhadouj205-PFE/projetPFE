import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Génère un PDF via pdf-lib (serverless-compatible, sans Puppeteer/Chrome)
 */
export async function generateCertificatePDF(data) {
  console.log("-> [pdf-lib] Generating PDF...");

  const now = new Date();
  const todayFr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  // Données marginales
  let marginalText = 'لا شيء / Néant';
  if (data.marginal_status === 'married') marginalText = `Marié(e) avec ${data.marginal_spouse || ''}`;
  if (data.marginal_status === 'divorced') marginalText = `Divorcé(e) de ${data.marginal_spouse || ''}`;

  // Créer un nouveau document PDF A4
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 en points
  const { width, height } = page.getSize();

  // Polices intégrées (pas besoin de réseau)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  let y = height - 60;

  // ── Helpers ────────────────────────────────────────────────────────────
  const drawText = (text, x, yPos, font, size, color = rgb(0, 0, 0)) => {
    page.drawText(text || '', { x, y: yPos, font, size, color });
  };

  const drawLine = (x1, y1, x2, y2, thickness = 0.5) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(0.4, 0.4, 0.4) });
  };

  const drawRow = (label, value, yPos) => {
    drawText(label, margin, yPos, fontRegular, 11);
    // Ligne pointillée
    const labelWidth = fontRegular.widthOfTextAtSize(label, 11);
    for (let x = margin + labelWidth + 8; x < width - margin - 150; x += 6) {
      page.drawLine({ start: { x, y: yPos + 2 }, end: { x: x + 3, y: yPos + 2 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
    }
    drawText(value || '—', width - margin - 145, yPos, fontBold, 11, rgb(0.1, 0.1, 0.6));
  };

  // ── EN-TÊTE ────────────────────────────────────────────────────────────
  // Bande supérieure verte (couleur officielle algérienne)
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.0, 0.47, 0.25) });

  drawText('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', margin, height - 30, fontBold, 11, rgb(1, 1, 1));
  drawText('الجمهورية الجزائرية الديمقراطية الشعبية', margin, height - 50, fontRegular, 10, rgb(0.9, 0.9, 0.9));
  drawText(`Wilaya: ${(data.wilaya || '').toUpperCase()}   |   Commune: ${(data.municipality || data.commune || '').toUpperCase()}`, margin, height - 68, fontRegular, 9, rgb(0.85, 0.85, 0.85));

  y = height - 110;

  // Titre principal
  drawText('ACTE DE NAISSANCE', margin, y, fontBold, 20, rgb(0.0, 0.47, 0.25));
  drawText('شهادة الميلاد', width - margin - 120, y, fontBold, 16, rgb(0.0, 0.47, 0.25));
  drawLine(margin, y - 8, width - margin, y - 8, 1.5);

  y -= 35;

  // ── SECTION : INFOS DE L'ACTE ─────────────────────────────────────────
  drawText('INFORMATIONS DE L\'ACTE', margin, y, fontBold, 12, rgb(0.15, 0.15, 0.15));
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 1, color: rgb(0.0, 0.47, 0.25) });
  y -= 22;

  drawRow("Numéro de l'acte :", data.actNumber, y); y -= 22;
  drawRow("Année de l'acte :", data.actYear, y); y -= 22;
  drawRow("Position :", data.position, y); y -= 22;
  drawRow("Nombre de copies :", String(data.numberOfCopies || 1), y); y -= 30;

  // ── SECTION : IDENTITÉ ────────────────────────────────────────────────
  drawLine(margin, y, width - margin, y, 0.5);
  y -= 20;
  drawText('IDENTITÉ DU DÉCLARÉ', margin, y, fontBold, 12, rgb(0.15, 0.15, 0.15));
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 1, color: rgb(0.0, 0.47, 0.25) });
  y -= 22;

  const fullName = `${data.firstName || data.first_name || ''} ${data.lastName || data.last_name || ''}`.trim();
  drawRow("Nom et Prénom :", fullName, y); y -= 22;
  drawRow("Date de naissance :", data.birthDate || data.birth_date, y); y -= 22;
  drawRow("Lieu de naissance :", data.birthPlace || data.birth_place, y); y -= 22;
  drawRow("Sexe :", data.gender === 'male' ? 'Masculin' : data.gender === 'female' ? 'Féminin' : (data.gender || ''), y); y -= 30;

  // ── SECTION : PARENTS ────────────────────────────────────────────────
  drawLine(margin, y, width - margin, y, 0.5);
  y -= 20;
  drawText('INFORMATIONS DES PARENTS', margin, y, fontBold, 12, rgb(0.15, 0.15, 0.15));
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 1, color: rgb(0.0, 0.47, 0.25) });
  y -= 22;

  drawRow("Nom et Prénom du Père :", data.fatherName || data.father_name, y); y -= 22;
  drawRow("Nom et Prénom de la Mère :", data.motherName || data.mother_name, y); y -= 30;

  // ── SECTION : MENTIONS MARGINALES ────────────────────────────────────
  drawLine(margin, y, width - margin, y, 0.5);
  y -= 20;
  drawText('MENTIONS MARGINALES', margin, y, fontBold, 12, rgb(0.15, 0.15, 0.15));
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 1, color: rgb(0.0, 0.47, 0.25) });
  y -= 22;
  drawRow("Statut :", marginalText, y); y -= 30;

  // ── SECTION : DEMANDEUR ───────────────────────────────────────────────
  drawLine(margin, y, width - margin, y, 0.5);
  y -= 20;
  drawText('INFORMATIONS DU DEMANDEUR', margin, y, fontBold, 12, rgb(0.15, 0.15, 0.15));
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 1, color: rgb(0.0, 0.47, 0.25) });
  y -= 22;

  const requesterName = `${data.citizenFirstName || ''} ${data.citizenLastName || ''}`.trim();
  drawRow("Nom du demandeur :", requesterName || fullName, y); y -= 22;
  drawRow("Email :", data.citizenEmail, y); y -= 22;
  drawRow("NIN :", data.nin, y); y -= 40;

  // ── PIED DE PAGE ──────────────────────────────────────────────────────
  drawLine(margin, y, width - margin, y, 1);
  y -= 15;
  drawText(`Date d'émission : ${todayFr}`, margin, y, fontRegular, 9, rgb(0.4, 0.4, 0.4));
  drawText('Cachet et Signature de l\'APC', width - margin - 180, y, fontRegular, 9, rgb(0.4, 0.4, 0.4));

  // Zone signature
  y -= 50;
  page.drawRectangle({ x: width - margin - 160, y: y, width: 140, height: 45, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
  drawText('Signature officielle', width - margin - 145, y + 15, fontRegular, 8, rgb(0.7, 0.7, 0.7));

  // Bande verte basse
  page.drawRectangle({ x: 0, y: 0, width, height: 20, color: rgb(0.0, 0.47, 0.25) });
  drawText('Baladiya Digital — Service État Civil Numérique', margin, 5, fontRegular, 7, rgb(1, 1, 1));

  // ── SÉRIALISATION ─────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── SMTP (inchangé) ───────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim()
  }
});

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, status, employeeName, comment, pdfBuffer) {
    const subject = `Votre document est prêt  — ${requestSubject || 'Acte de Naissance'}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#00782B;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px"> Baladiya Digital</h1>
          <p style="color:#c8f5d8;margin:4px 0 0">Service État Civil Numérique</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
          <p>Votre demande d'<strong>${requestSubject || 'Acte de Naissance'}</strong> a été <span style="color:#00782B;font-weight:bold">approuvée </span>.</p>
          <p>Votre document officiel est joint à cet email en format PDF.</p>
          ${comment ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px;font-style:italic">Note : ${comment}</p>` : ''}
          <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || 'Service État Civil'}</strong></p>
        </div>
        <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
          Baladiya Digital — Ce document est généré automatiquement, merci de ne pas répondre.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Baladiya Digital" <${(process.env.SMTP_USER || '').trim()}>`,
      to: (citizenEmail || '').trim(),
      subject,
      html,
      attachments: [{
        filename: 'acte_naissance.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    return info;
  }
};

export { transporter };