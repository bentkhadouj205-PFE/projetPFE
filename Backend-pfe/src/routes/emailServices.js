import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER, // ← 'a94997001@smtp-brevo.com'
    pass: process.env.BREVO_SMTP_PASS, // ← 'xsmtpsib-...'
  },
});

export async function initializeEmail() {
  try {
    await transporter.verify();
    console.log('✅ Brevo SMTP ready (baladiyadigital27@gmail.com)');
    return true;
  } catch (error) {
    console.error('❌ Brevo SMTP failed:', error.message);
    return false;
  }
}

export async function generateCertificatePDF(data) {
  const now = new Date();
  const today = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;

  const formatDate = (d) => {
    if (!d) return '../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  };

  const formatTime = (t) => t ? t.substring(0,5) : '......';

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black    = rgb(0,0,0);
  const grey     = rgb(0.5,0.5,0.5);
  const green    = rgb(0.0,0.47,0.25);
  const white    = rgb(1,1,1);

  const sanitize = (str) => {
    if (!str) return '';
    // Replace non-WinAnsi characters with '?' to avoid PDF crashes
    return String(str).replace(/[^\x00-\x7F]/g, '');
  };

  const txt = (text, x, y, f=font, size=9, color=black) => {
    const str = sanitize(text);
    if (!str) return;
    page.drawText(str, { x, y, font:f, size, color });
  };

  const dots = (x1, x2, yPos) => {
    for (let x = x1; x < x2; x += 4) {
      page.drawLine({ 
        start: { x: x, y: yPos }, 
        end: { x: x + 2, y: yPos }, 
        thickness: 0.5, 
        color: grey 
      });
    }
  };

  const ln = (x1,y1,x2,y2,t=0.5,c=black) =>
    page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2}, thickness:t, color:c });

  // ── HEADER ──────────────────────────────────────────────────────────
  page.drawRectangle({ x:0, y:height-60, width, height:60, color:green });
  txt('REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE', 80, height-22, fontBold, 10, white);
  txt('Ministere de l\'Interieur - Registre National de l\'Etat Civil', 110, height-38, font, 8, white);
  txt(`Wilaya: ${(data.wilayaDelivrance||'').toUpperCase()}`, 50, height-52, font, 7, rgb(0.8,0.9,0.8));

  // ── TITLE ────────────────────────────────────────────────────────────
  txt('ACTE DE NAISSANCE / Shahada Al Milad', 145, height-80, fontBold, 13);
  txt('Copie electronique', 225, height-95, font, 8, grey);
  ln(50, height-100, width-50, height-100, 1, green);

  // ── Cert Number + Date ───────────────────────────────────────────────
  let y = height - 118;
  txt('N° Chahada:', 50, y, font, 9);
  txt(data.numeroChahada || '..........', 125, y, fontBold, 9);
  txt('N° Acte:', 280, y, font, 9);
  txt(data.numeroActe || '..........', 325, y, fontBold, 9);
  txt('fi yawm / le:', 420, y, font, 9);
  dots(490, width-50, y-1);

  // ── ROW 1 — heure + lieu naissance ──────────────────────────────────
  y -= 20;
  txt("'ala al-sa'a:", 50, y, font, 9);
  txt(formatTime(data.heureNaissance), 125, y, fontBold, 9);
  dots(160, 260, y-1);
  txt("wulida(t) bi:", 265, y, font, 9);
  dots(330, width-50, y-1);

  // ── ROW 2 — baladiya + wilaya ────────────────────────────────────────
  y -= 18;
  txt('Baladiya:', 50, y, font, 9);
  txt(data.communeNaissance || '..........', 100, y, fontBold, 9);
  dots(100 + fontBold.widthOfTextAtSize(data.communeNaissance||'', 9) + 5, 310, y-1);
  txt('Wilaya:', 315, y, font, 9);
  txt(data.wilayaNaissance || '..........', 355, y, fontBold, 9);
  dots(355 + fontBold.widthOfTextAtSize(data.wilayaNaissance||'', 9) + 5, width-50, y-1);

  // ── ROW 3 — date + nom ──────────────────────────────────────────────
  y -= 18;
  txt(formatDate(data.dateNaissance), 50, y, fontBold, 9);
  txt('Al-musamm(a/at):', 130, y, font, 9);
  txt(data.fullName || '..........', 240, y, fontBold, 10);
  dots(240 + fontBold.widthOfTextAtSize(data.fullName||'', 10) + 5, width-50, y-1);

  // ── ROW 4 — sexe ────────────────────────────────────────────────────
  y -= 18;
  txt('Al-sinn (Sexe):', 50, y, font, 9);
  txt(data.sexe === 'M' ? 'Masculin / Dhakar' : data.sexe === 'F' ? 'Feminin / Untha' : '..........', 140, y, fontBold, 9);
  dots(300, width-50, y-1);

  // ── ROW 5 — père ────────────────────────────────────────────────────
  y -= 18;
  txt("Ibn(at) / Pere:", 50, y, font, 9);
  txt(data.pereNomPrenom || '..........', 130, y, fontBold, 9);
  dots(130 + fontBold.widthOfTextAtSize(data.pereNomPrenom||'', 9) + 5, 310, y-1);
  txt("'omrohu:", 315, y, font, 9);
  txt(data.pereAge ? String(data.pereAge) : '......', 360, y, fontBold, 9);
  dots(385, width-50, y-1);

  // ── ROW 6 — métier père ──────────────────────────────────────────────
  y -= 18;
  txt('Mihnatohu (Profession):', 50, y, font, 9);
  txt(data.pereMetier || '..........', 185, y, fontBold, 9);
  dots(185 + fontBold.widthOfTextAtSize(data.pereMetier||'', 9) + 5, width-50, y-1);

  // ── ROW 7 — mère ────────────────────────────────────────────────────
  y -= 18;
  txt("Wa / Mere:", 50, y, font, 9);
  txt(data.mereNomPrenom || '..........', 110, y, fontBold, 9);
  dots(110 + fontBold.widthOfTextAtSize(data.mereNomPrenom||'', 9) + 5, 310, y-1);
  txt("'omroha:", 315, y, font, 9);
  txt(data.mereAge ? String(data.mereAge) : '......', 360, y, fontBold, 9);
  dots(385, width-50, y-1);

  // ── ROW 8 — métier mère ──────────────────────────────────────────────
  y -= 18;
  txt('Mihnatoha (Profession):', 50, y, font, 9);
  txt(data.mereMetier || '..........', 185, y, fontBold, 9);
  dots(185 + fontBold.widthOfTextAtSize(data.mereMetier||'', 9) + 5, width-50, y-1);

  // ── ROW 9 — domicile ─────────────────────────────────────────────────
  y -= 18;
  txt('Al-sakinin / Domicile:', 50, y, font, 9);
  dots(175, 250, y-1);
  txt('Baladiya:', 255, y, font, 9);
  txt(data.domicileCommune || '..........', 305, y, fontBold, 9);
  txt('Wilaya:', 410, y, font, 9);
  txt(data.domicileWilaya || '..........', 450, y, fontBold, 9);

  // ── ROW 10 — rédigé ──────────────────────────────────────────────────
  y -= 18;
  txt('Hurira fi:', 50, y, font, 9);
  dots(95, 270, y-1);
  txt("'ala al-sa'a:", 275, y, font, 9);
  txt(formatTime(data.heureRedaction), 345, y, fontBold, 9);
  dots(375, width-50, y-1);

  // ── ROW 11 — déclaré par ─────────────────────────────────────────────
  y -= 18;
  txt("I'lan adla bihi Al-sayyid(a):", 50, y, font, 9);
  txt(data.declarePar || '..........', 210, y, fontBold, 9);
  dots(210 + fontBold.widthOfTextAtSize(data.declarePar||'', 9) + 5, width-50, y-1);

  y -= 15;
  dots(50, width-50, y-1);

  // ── ROW 12 — officier ────────────────────────────────────────────────
  y -= 18;
  txt("Wa ba'da al-tilawa waqa'a ma'ana nahnu:", 50, y, font, 8);
  txt(data.officierEtatCivil || '..........', 265, y, fontBold, 9);
  dots(265 + fontBold.widthOfTextAtSize(data.officierEtatCivil||'', 9) + 5, width-200, y-1);
  txt('Dabitu al-hala al-madaniya', width-195, y, font, 7);

  // ── Mentions marginales ───────────────────────────────────────────────
  y -= 18;
  txt('Al-bayanat al-hamishiya:', 50, y, font, 9);
  if (data.marginalNotes) {
    txt(data.marginalNotes.substring(0,80), 185, y, font, 8);
  }
  dots(185, width-50, y-1);
  y -= 14; dots(50, width-50, y-1);
  y -= 14; dots(50, width-50, y-1);
  y -= 14; dots(50, width-50, y-1);

  // ── تاريخ الإصدار ────────────────────────────────────────────────────
  ln(50, y-8, width-50, y-8, 0.3);
  y -= 22;
  txt(`Hurrira bi: ${data.redigeA || data.domicileCommune || 'Mostaganem'}   fi:   ${today}`, 50, y, font, 9);

  // ── الاسم اللاتيني ───────────────────────────────────────────────────
  y -= 22;
  txt('Al-kitaba al-latiniya lil-ism wal-laqab / Ecriture latine:', 100, y, fontBold, 8);
  y -= 14;
  txt(data.fullName || '..........', 200, y, fontBold, 11);
  dots(50, width-50, y-2);

  // ── الملاحظات ────────────────────────────────────────────────────────
  y -= 22;
  txt('1- Kamil al-huruf / Toutes les lettres', 50, y, font, 8, grey);
  y -= 12;
  txt('2- Ism wa laqab al-awlad / Nom et prenom des enfants', 50, y, font, 8, grey);

  // ── تذييل ────────────────────────────────────────────────────────────
  page.drawRectangle({ x:0, y:0, width, height:30, color:green });
  txt('Mustakhraj min Al-Sijil Al-Watani lil-Hala Al-Madaniya - Al-Marja\': J.M 7', 90, 10, font, 8, white);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBuffer) {
    const info = await transporter.sendMail({
      from: '"Baladiya Digital" <baladiyadigital27@gmail.com>',
      to: citizenEmail,
      subject: `Votre document est prêt - ${requestSubject || 'Acte de Naissance'}`,
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
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return { messageId: info.messageId };
  },
};