import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function initializeEmail() {
  console.log('✅ Resend email service ready');
  return true;
}

export async function generateCertificatePDF(data) {
  console.log('-> [pdf-lib] Generating PDF...');

  const now = new Date();
  const todayFr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  const green = rgb(0.0, 0.47, 0.25);
  const grey = rgb(0.4, 0.4, 0.4);
  const lightGrey = rgb(0.95, 0.95, 0.95);
  const blue = rgb(0.1, 0.1, 0.6);

  const txt = (text, x, y, font, size, color = black) => {
    const str = String(text ?? '');
    if (!str) return;
    page.drawText(str, { x, y, font, size, color });
  };

  const line = (x1, y1, x2, y2, thickness = 0.5, color = black) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  };

  const rect = (x, y, w, h, color) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
  };

  const dottedRow = (label, value, yPos) => {
    txt(label, 50, yPos, fontRegular, 10);
    const labelW = fontRegular.widthOfTextAtSize(label, 10);
    for (let x = 50 + labelW + 6; x < width - 160; x += 5) {
      page.drawLine({ start: { x, y: yPos + 2 }, end: { x: x + 2.5, y: yPos + 2 }, thickness: 0.4, color: rgb(0.6, 0.6, 0.6) });
    }
    txt(value || '-', width - 155, yPos, fontBold, 10, blue);
  };

  // Header
  rect(0, height - 75, width, 75, green);
  txt('REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE', 50, height - 25, fontBold, 10, white);
  txt('Wilaya: ' + (data.wilaya || '').toUpperCase() + '   |   Commune: ' + (data.commune || '').toUpperCase(), 50, height - 55, fontRegular, 8, rgb(0.8, 0.9, 0.8));

  // Title
  let y = height - 100;
  txt('ACTE DE NAISSANCE', 50, y, fontBold, 18, green);
  line(50, y - 6, width - 50, y - 6, 1.5, green);

  // Demandeur
  y -= 30;
  rect(50, y - 3, width - 100, 16, lightGrey);
  txt('INFORMATIONS DU DEMANDEUR', 55, y, fontBold, 10, rgb(0.2, 0.2, 0.2));
  line(50, y - 4, width - 50, y - 4, 0.8, green);
  y -= 22;
  dottedRow('Nom et Prenom :', data.fullName || '', y); y -= 20;
  dottedRow('Email :', data.citizenEmail || '', y); y -= 20;
  dottedRow('NIN :', data.nin || '', y); y -= 28;

  // Acte
  line(50, y, width - 50, y, 0.5, grey);
  y -= 18;
  rect(50, y - 3, width - 100, 16, lightGrey);
  txt("INFORMATIONS DE L'ACTE", 55, y, fontBold, 10, rgb(0.2, 0.2, 0.2));
  line(50, y - 4, width - 50, y - 4, 0.8, green);
  y -= 22;
  dottedRow('Wilaya :', data.wilaya || '', y); y -= 20;
  dottedRow('Commune :', data.commune || '', y); y -= 20;
  dottedRow("Annee de l'acte :", data.actYear || '', y); y -= 20;
  dottedRow("N de l'acte :", data.actNumber || '', y); y -= 28;

  // Corps officiel
  line(50, y, width - 50, y, 0.5, grey);
  y -= 18;
  rect(50, y - 3, width - 100, 16, lightGrey);
  txt('DOCUMENT OFFICIEL', 55, y, fontBold, 10, rgb(0.2, 0.2, 0.2));
  line(50, y - 4, width - 50, y - 4, 0.8, green);
  y -= 28;

  const bodyLines = [
    'En date de .............. a .............. heures',
    'Ne(e) a ' + (data.commune || '..............') + ' Wilaya ' + (data.wilaya || '..............'),
    'Nomme(e) : ' + (data.fullName || '..............'),
    'N Acte : ' + (data.actNumber || '..........') + '   Annee : ' + (data.actYear || '....'),
    'Fils(fille) de .............. age ......  profession ..............',
    'Et de .............. age ......  profession ..............',
    'Domicilies a .............. Commune ' + (data.commune || '..............'),
    'Redige le .............. a .............. heures',
    'Mentions marginales : .................................................................',
  ];
  for (const bl of bodyLines) {
    txt(bl, 55, y, fontRegular, 9, black);
    y -= 18;
  }

  // Signature
  y -= 20;
  line(50, y, width - 50, y, 1, grey);
  y -= 15;
  txt("Date d'emission : " + todayFr, 50, y, fontRegular, 8, grey);
  page.drawRectangle({ x: width - 200, y: y - 55, width: 150, height: 50, borderColor: grey, borderWidth: 0.5 });
  txt('Cachet et Signature', width - 193, y - 20, fontRegular, 8, grey);
  txt("de l'APC", width - 175, y - 35, fontRegular, 8, grey);

  // Footer
  rect(0, 0, width, 22, green);
  txt('Baladiya Digital - Service Etat Civil Numerique', 50, 6, fontRegular, 7, white);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBuffer) {
    const { data, error } = await resend.emails.send({
      from: 'Baladiya Digital <onboarding@resend.dev>',
      to: 'bentalebkhadouj39@gmail.com', // ← always send to your own email for demo
      subject: `Votre document est pret - ${requestSubject || 'Acte de Naissance'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
          <div style="background:#00782B;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
            <p style="color:#c8f5d8;margin:4px 0 0">Service Etat Civil Numerique</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
            <p>Votre demande d'<strong>${requestSubject || 'Acte de Naissance'}</strong> a ete <span style="color:#00782B;font-weight:bold">approuvee</span>.</p>
            <p>Votre document officiel est joint a cet email en format PDF.</p>
            ${comment ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px;font-style:italic">Note : ${comment}</p>` : ''}
            <p style="color:#888;font-size:13px;margin-top:20px">Traite par : <strong>${employeeName || 'Service Etat Civil'}</strong></p>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
            Baladiya Digital - Document genere automatiquement.
          </div>
        </div>
      `,
      attachments: [{
        filename: 'acte_naissance.pdf',
        content: pdfBuffer.toString('base64'),
      }],
    });

    if (error) throw new Error(error.message);
    return { messageId: data?.id };
  },
};