import PDFDocument from 'pdfkit';
import { PDFDocument as LibPDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── OFFICIAL TEMPLATE ─────────────────────────────────────────────
const TEMPLATE_PATH = path.join(__dirname, '../../uploads/templates/Demande_Acte_Naissance.pdf');
let templateBytes = null;
try {
  if (fs.existsSync(TEMPLATE_PATH)) {
    templateBytes = fs.readFileSync(TEMPLATE_PATH);
    console.log('✅ Official birth certificate template loaded');
  } else {
    console.warn('⚠️ Official template not found at:', TEMPLATE_PATH);
  }
} catch (err) {
  console.warn('⚠️ Error loading official template:', err.message);
}


export class PDFService {
  //  EXISTING — Citizen Request PDF (unchanged)
  static generateCitizenPDF(requestRow) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff');
        doc.fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        doc.fontSize(14).font('Helvetica').text('Fiche de Traitement de Demande', 50, 65);
        doc.fontSize(10)
           .text(`Ref: ${requestRow.id ?? 'N/A'}`, 450, 40)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 450, 55);

        doc.fillColor('#1f2937')
           .fontSize(16).font('Helvetica-Bold')
           .text('INFORMATIONS DU CITOYEN', 50, 130);
        doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

        const citizenInfo = [
          ['Nom complet:', `${requestRow.citizen_first_name ?? ''} ${requestRow.citizen_last_name ?? ''}`.trim()],
          ['Email:',       requestRow.citizen_email   ?? 'Non spécifié'],
          ['NIN:',         requestRow.citizen_nin     ?? 'Non spécifié'],
          ['Adresse:',     requestRow.citizen_address ?? 'Non spécifiée']
        ];

        let y = 170;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of citizenInfo) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica').text(value, 200, y);
          doc.font('Helvetica-Bold');
          y += 25;
        }

        y += 20;
        doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold')
           .text('DÉTAILS DE LA DEMANDE', 50, y);
        doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');

        const requestInfo = [
          ['Sujet:',       requestRow.subject      ?? 'Non spécifié'],
          ['Description:', requestRow.description  ?? 'Aucune description'],
          ['Assigné à:',   requestRow.assigned_employee_name ?? 'Non spécifié'],
          ['Date:',        requestRow.created_at
                            ? new Date(requestRow.created_at).toLocaleDateString('fr-FR')
                            : 'Non spécifiée'],
          ['Statut:',      requestRow.status ?? 'En attente']
        ];

        y += 40;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of requestInfo) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica');
          if (label === 'Description:') {
            doc.text(value, 200, y, { width: 362 });
            y += 40;
          } else {
            doc.text(value, 200, y);
            y += 25;
          }
          doc.font('Helvetica-Bold');
        }

        if (requestRow.comment) {
          y += 20;
          doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold')
             .text('COMMENTAIRE', 50, y);
          doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');
          y += 35;
          doc.fillColor('#1f2937').fontSize(11).font('Helvetica')
             .text(requestRow.comment, 50, y, { width: 512 });
          y += 40;
        }

        y += 20;
        doc.fillColor('#059669').fontSize(16).font('Helvetica-Bold')
           .text('VALIDATION', 50, y);
        doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');
        y += 35;
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica')
           .text('Cette demande a été traitée et validée.', 50, y)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, y + 20)
           .text(`Heure: ${new Date().toLocaleTimeString('fr-FR')}`, 50, y + 40);

        if (requestRow.id) {
          doc.fontSize(8).fillColor('#9ca3af')
             .text(`ID de la demande: ${requestRow.id}`, 50, y + 65);
        }

        doc.rect(0, 750, 612, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
           .text('Document généré par Baladiya Digital', 50, 765)
           .text('© 2026 Administration Municipale', 50, 780);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  //  EXISTING — Notification PDF (unchanged)
  // ─────────────────────────────────────────────────────────────────
  static generateNotificationPDF(employeeInfo, notificationData) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff');
        doc.fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        doc.fontSize(14).font('Helvetica').text('Notification', 50, 65);
        doc.fontSize(10)
           .text(`Employé: ${employeeInfo}`, 430, 40)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 430, 55);

        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold')
           .text('DÉTAILS DE LA NOTIFICATION', 50, 130);
        doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

        const fields = [
          ['Titre:',   notificationData.title   ?? 'Non spécifié'],
          ['Message:', notificationData.message ?? 'Aucun message'],
          ['Type:',    notificationData.type    ?? 'Non spécifié'],
          ['Service:', notificationData.service ?? 'Général'],
          ['Lu:',      notificationData.is_read ? 'Oui' : 'Non']
        ];

        let y = 170;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of fields) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica');
          if (label === 'Message:') {
            doc.text(value, 200, y, { width: 362 });
            y += 40;
          } else {
            doc.text(value, 200, y);
            y += 25;
          }
          doc.font('Helvetica-Bold');
        }

        doc.rect(0, 750, 612, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
           .text('Document généré par Baladiya Digital', 50, 765)
           .text('© 2026 Administration Municipale', 50, 780);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  //  NEW — شهادة الميلاد  (Acte de Naissance)
  //  @param {object} data — joined row from citizens + actes_naissance
  // ─────────────────────────────────────────────────────────────────
  static generateActeNaissance(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument({ size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        const W = 595; // A4 width in points

        // ── Header bar ───────────────────────────────────────────────
        doc.rect(0, 0, W, 90).fill('#1e3a5f');
        doc.fillColor('#ffffff')
           .fontSize(15).font('Helvetica-Bold')
           .text('الجمهورية الجزائرية الديموقراطية الشعبية', 50, 18, { align: 'center', width: W - 100 })
           .fontSize(10).font('Helvetica')
           .text('وزارة الداخلية والجماعات المحلية — السجل الوطني للحالة المدنية', 50, 40, { align: 'center', width: W - 100 });

        // ── Wilaya / Daira / Commune (top right) ────────────────────
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold')
           .text(`Wilaya: ${data.wilaya || 'Mostaganem'}`,  W - 200, 100)
           .text(`Commune: ${data.commune || 'Mostaganem'}`, W - 200, 115);

        // ── Title ────────────────────────────────────────────────────
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('ACTE DE NAISSANCE', 50, 105, { align: 'center', width: W - 100 });
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
           .text('شهادة الميلاد — Copie électronique', 50, 130, { align: 'center', width: W - 100 });

        // ── Cert number line ─────────────────────────────────────────
        doc.moveTo(50, 150).lineTo(W - 50, 150).stroke('#e5e7eb');
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica')
           .text(`N° Acte: ${data.numero_acte || '...........'}`, 50, 158)
           .text(`Date: ${data.date_acte ? new Date(data.date_acte).toLocaleDateString('fr-FR') : '../../....'}`, W - 200, 158);
        doc.moveTo(50, 172).lineTo(W - 50, 172).stroke('#e5e7eb');

        // ── Fields helper ────────────────────────────────────────────
        let y = 185;
        const field = (label, value) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#4b5563')
             .text(label, 50, y, { width: 160, continued: false });
          doc.fontSize(10).font('Helvetica').fillColor('#1f2937')
             .text(value || '...........................', 220, y);
          y += 28;
        };

        // ── Birth info ───────────────────────────────────────────────
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('NAISSANCE / الميلاد', 50, y);
        y += 20;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;

        field('Date de naissance:',  data.date_acte        ? new Date(data.date_acte).toLocaleDateString('fr-FR') : null);
        field('Heure:',              data.heure_naissance  || '///');
        field('Lieu (commune):',     data.commune_naissance || data.commune);
        field('Wilaya:',             data.wilaya);
        field('Nom et prénom:',      `${data.nom || ''} ${data.prenom || ''}`.trim());
        field('Sexe:',               data.sexe === 'M' ? 'Masculin / ذكر' : data.sexe === 'F' ? 'Féminin / أنثى' : '///');

        // ── Father ───────────────────────────────────────────────────
        y += 5;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('PÈRE / الأب', 50, y);
        y += 20;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;

        field('Nom et prénom:',  data.pere_nom_prenom);
        field('Âge:',            data.pere_age    != null ? String(data.pere_age) : '///');
        field('Profession:',     data.pere_metier != null ? data.pere_metier      : '///');

        // ── Mother ───────────────────────────────────────────────────
        y += 5;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('MÈRE / الأم', 50, y);
        y += 20;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;

        field('Nom et prénom:',  data.mere_nom_prenom);
        field('Âge:',            data.mere_age    != null ? String(data.mere_age) : '///');
        field('Profession:',     data.mere_metier != null ? data.mere_metier      : '///');

        // ── Domicile ─────────────────────────────────────────────────
        y += 5;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('DOMICILE / السكن', 50, y);
        y += 20;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;

        field('Commune:',  data.domicile_commune || data.commune);
        field('Wilaya:',   data.domicile_wilaya  || data.wilaya);

        // ── Notes ────────────────────────────────────────────────────
        if (data.notes) {
          y += 5;
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#4b5563').text('Notes / البيانات الهامشية:', 50, y);
          y += 15;
          doc.fontSize(10).font('Helvetica').fillColor('#1f2937')
             .text(data.notes, 50, y, { width: W - 100 });
          y += 30;
        }

        // ── Signature line ───────────────────────────────────────────
        y += 10;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;
        const today = new Date().toLocaleDateString('fr-FR');
        doc.fontSize(10).font('Helvetica').fillColor('#1f2937')
           .text(`Établi à ${data.wilaya_delivrance || data.wilaya || 'Mostaganem'}, le ${today}`, 50, y);

        // ── Latin name ───────────────────────────────────────────────
        y += 25;
        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
           .text('Nom et prénom en caractères latins / الكتابة بالأحرف اللاتينية:', 50, y);
        y += 14;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937')
           .text(`${(data.nom || '').toUpperCase()} ${(data.prenom || '').toUpperCase()}`, 50, y);

        // ── Footer ───────────────────────────────────────────────────
        doc.rect(0, 800, W, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
           .text('Extrait du Registre National de l\'État Civil — Réf: J.M 7', 50, 815, { align: 'center', width: W - 100 })
           .text('© 2026 Baladiya Digital — Administration Municipale', 50, 827, { align: 'center', width: W - 100 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  //  NEW — بطاقة إقامة  (Carte de Séjour / Résidence)
  //  @param {object} data — row from users + demandes
  // ─────────────────────────────────────────────────────────────────
  static generateCarteSejour(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument({ size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        const W     = 595;
        const today = new Date().toLocaleDateString('fr-FR');

        // ── Header bar ───────────────────────────────────────────────
        doc.rect(0, 0, W, 90).fill('#1e3a5f');
        doc.fillColor('#ffffff')
           .fontSize(15).font('Helvetica-Bold')
           .text('الجمهورية الجزائرية الديموقراطية الشعبية', 50, 18, { align: 'center', width: W - 100 })
           .fontSize(10).font('Helvetica')
           .text('وزارة الداخلية', 50, 40, { align: 'center', width: W - 100 });

        // ── Wilaya / Commune ─────────────────────────────────────────
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold')
           .text('Wilaya: Mostaganem',  W - 200, 100)
           .text('Commune: Mostaganem', W - 200, 115);

        // ── Title ────────────────────────────────────────────────────
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a5f')
           .text('CARTE DE RÉSIDENCE', 50, 105, { align: 'center', width: W - 100 });
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
           .text('بطاقة إقامة', 50, 130, { align: 'center', width: W - 100 });

        doc.moveTo(50, 150).lineTo(W - 50, 150).stroke('#e5e7eb');

        // ── Intro text ───────────────────────────────────────────────
        let y = 165;
        doc.fontSize(11).font('Helvetica').fillColor('#1f2937')
           .text('Nous, Président de l\'Assemblée Populaire Communale de Mostaganem,', 50, y);
        y += 20;
        doc.text('Certifions que:', 50, y);
        y += 25;

        // ── Fields helper ────────────────────────────────────────────
        const field = (label, value) => {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#4b5563')
             .text(label, 50, y, { width: 160 });
          doc.fontSize(11).font('Helvetica').fillColor('#1f2937')
             .text(value || '...........................', 220, y);
          y += 30;
        };

        // ── Citizen fields ───────────────────────────────────────────
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 12;

        field('Nom et prénom:',    `${data.nom || ''} ${data.prenom || ''}`.trim());
        field('Né(e) à:',          data.commune     || '...');
        field('Date naissance:',   data.date_naissance ? new Date(data.date_naissance).toLocaleDateString('fr-FR') : '../../....');
        field('Nationalité:',      'Algérienne / جزائرية');
        field('Profession:',       data.metier  || '...');
        field('Adresse:',          data.adresse || '...');

        // ── Residence statement ──────────────────────────────────────
        y += 10;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 15;
        doc.fontSize(11).font('Helvetica').fillColor('#1f2937')
           .text('réside à la même adresse depuis plus de six (6) mois.', 50, y, { width: W - 100 });
        y += 25;
        doc.text('La présente attestation lui est délivrée pour servir et valoir ce que de droit.', 50, y, { width: W - 100 });

        // ── Date & signature ─────────────────────────────────────────
        y += 40;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 15;
        doc.fontSize(11).font('Helvetica').fillColor('#1f2937')
           .text(`Établi à Mostaganem, le ${today}`, 50, y);

        // ── Validity note ────────────────────────────────────────────
        y += 40;
        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
           .text('(1) La validité de cette attestation ne peut dépasser six (6) mois.', 50, y, { width: W - 100 });

        // ── Latin name ───────────────────────────────────────────────
        y += 30;
        doc.moveTo(50, y).lineTo(W - 50, y).stroke('#e5e7eb');
        y += 10;
        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
           .text('Nom et prénom en caractères latins / الكتابة بالأحرف اللاتينية:', 50, y);
        y += 14;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937')
           .text(`${(data.nom || '').toUpperCase()} ${(data.prenom || '').toUpperCase()}`, 50, y);

        // ── Footer ───────────────────────────────────────────────────
        doc.rect(0, 800, W, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
           .text('Document généré par Baladiya Digital', 50, 815, { align: 'center', width: W - 100 })
           .text('© 2026 Administration Municipale de Mostaganem', 50, 827, { align: 'center', width: W - 100 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  //  NEW — Fill official scanned Algerian birth certificate template
  //  Uses pdf-lib to overlay text on the scanned PDF image
  // ─────────────────────────────────────────────────────────────────
  static async generateOfficialActeNaissance(data) {
    if (!templateBytes) {
      throw new Error('Official template not found. Place Demande_Acte_Naissance.pdf in uploads/templates/');
    }

    const pdfDoc = await LibPDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const draw = (text, x, y, opts = {}) => {
      if (!text && text !== 0) return;
      page.drawText(String(text), {
        x, y, size: 10, font, color: rgb(0, 0, 0), ...opts
      });
    };

    // Helpers
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
    const fmtTime = (t) => t ? String(t).substring(0, 5) : '';
    const calcAge = (birthDate) => {
      if (!birthDate) return '';
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };

    // ═══════════════════════════════════════════════════════════════
    // COORDINATES — ADJUST THESE AFTER CALIBRATION
    // Use /api/pdf/debug-grid to generate calibration overlay
    // ═══════════════════════════════════════════════════════════════

    // Row 1: Date & time of birth
    draw(fmtDate(data.date_naissance), 180, height - 128);
    draw(fmtTime(data.heure_naissance), 400, height - 128);

    // Row 2: Place of birth
    draw(data.commune_naissance, 180, height - 152);
    draw(data.wilaya_naissance, 400, height - 152);

    // Row 3: Full name (nom et prénom)
    draw(data.nom_prenom, 180, height - 176);

    // Row 4: Age & sex
    draw(calcAge(data.date_naissance), 180, height - 200);
    draw(data.sexe === 'M' ? 'ذكر' : data.sexe === 'F' ? 'أنثى' : '', 340, height - 200);

    // Row 5: Father name & age
    draw(data.pere_nom_prenom, 180, height - 224);
    draw(data.pere_age, 460, height - 224);

    // Row 6: Father job, domicile
    draw(data.pere_metier, 130, height - 248);
    draw(data.pere_domicile_commune, 280, height - 248);
    draw(data.pere_domicile_wilaya, 430, height - 248);

    // Row 7: Mother name & age
    draw(data.mere_nom_prenom, 180, height - 272);
    draw(data.mere_age, 460, height - 272);

    // Row 8: Mother job, domicile
    draw(data.mere_metier, 130, height - 296);
    draw(data.mere_domicile_commune, 280, height - 296);
    draw(data.mere_domicile_wilaya, 430, height - 296);

    // Row 9: Domicile (if different)
    draw(data.domicile_commune, 180, height - 320);
    draw(data.domicile_wilaya, 400, height - 320);

    // Declaration section
    draw(fmtDate(data.redige_le), 140, height - 368);
    draw(fmtTime(data.redige_a_heure), 300, height - 368);
    draw(data.declare_par, 180, height - 392);
    draw(data.declare_par_titre, 430, height - 392);

    // Officer info
    draw(data.officier_etat_civil, 180, height - 440);
    draw(data.officier_commune, 330, height - 440);
    draw(data.officier_wilaya, 480, height - 440);

    // Marginal notes
    if (data.marginal_notes) {
      draw(data.marginal_notes, 50, height - 490, { size: 8, maxWidth: width - 100 });
    }

    // Footer info
    draw(`N° Acte: ${data.numero_acte || ''}`, 50, 55, { size: 9 });
    draw(`N° Chahada: ${data.numero_chahada || 'N/A'}`, 190, 55, { size: 9 });
    draw(`Wilaya: ${data.wilaya_delivrance || data.wilaya_naissance || ''}`, 330, 55, { size: 9 });
    draw(`Date: ${fmtDate(data.date_delivrance)}`, 470, 55, { size: 9 });

    return Buffer.from(await pdfDoc.save());
  }

  // ─────────────────────────────────────────────────────────────────
  //  DEBUG — Generate grid overlay for coordinate calibration
  // ─────────────────────────────────────────────────────────────────
  static async generateDebugGrid() {
    if (!templateBytes) {
      throw new Error('Official template not found');
    }

    const pdfDoc = await LibPDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    for (let x = 0; x < width; x += 50) {
      page.drawLine({ start: {x, y: 0}, end: {x, y: height}, thickness: 0.5, color: rgb(1, 0, 0) });
      page.drawText(`${x}`, { x: x + 2, y: height - 15, size: 8, color: rgb(1, 0, 0) });
    }
    for (let y = 0; y < height; y += 50) {
      page.drawLine({ start: {x: 0, y}, end: {x: width, y}, thickness: 0.5, color: rgb(1, 0, 0) });
      page.drawText(`${Math.round(y)}`, { x: 5, y: y + 5, size: 8, color: rgb(1, 0, 0) });
    }

    return Buffer.from(await pdfDoc.save());
  }
}

export default PDFService;