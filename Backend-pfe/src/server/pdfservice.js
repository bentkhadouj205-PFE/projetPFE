import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const PDFDocument = require('pdfkit');
const reshaper = require('arabic-reshaper');

// ─── Arabic helpers ────────────────────────────────────────────────────────────

/** Returns true if the string contains at least one Arabic character */
const isArabic = (str) => /[\u0600-\u06FF]/.test(str ?? '');

const ar = (str) => {
   if (!str) return '';
   return reshaper.convertArabic(String(str)).split(' ').reverse().join(' ');
};

/** Safe value: return the value or a dotted placeholder */
const v = (val, fallback = '...............') => (val ? String(val) : fallback);

/** Clean values that are default placeholders in the DB */
const clean = (val) => (!val || String(val).includes('/../') ? '' : val);

/** Format a date to DD/MM/YYYY */
const formatDate = (d) => {
   if (!d) return '';
   const dt = new Date(d);
   return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

// ─── PDFService ────────────────────────────────────────────────────────────────

export class PDFService {

   //  LANGUAGE DETECTOR  –  auto-detect from the data, no extra DB field needed

   static generateActeNaissance(data) {
      // DB stores child name in 'nom_prenom'; older callers may pass 'nom_prenom_enfant' or 'fullName'
      const nameField = data.nom_prenom || data.nom_prenom_enfant || data.fullName || '';
      if (isArabic(nameField)) {
         return PDFService.generateActeNaissanceArabic(data);
      }
      return PDFService.generateActeNaissanceFrench(data);
   }

   // ═══════════════════════════════════════════════════════════════════════════
   //  ACTE DE NAISSANCE – FRENCH (original, kept intact)
   // ═══════════════════════════════════════════════════════════════════════════

   static generateActeNaissanceFrench(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({
               size: 'A4',
               margins: { top: 30, bottom: 30, left: 40, right: 40 },
               bufferPages: true,
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const black = '#000000';
            const gray = '#666666';
            const W = 595.28;
            const marginX = 40;

            // Normalise DB row — supports both real DB column names and legacy field names
            const d = {
               // numero: DB uses 'numero_acte'
               numeroChahada: data.numero_acte || data.numero_chahada || data.numeroChahada || data.numeroActe,
               // d  ers may pass 'date_naissance'
               dateNaissance: data.date_naissance || (data.citizens && data.citizens.date_naissance) || data.date_naissance_enfant || data.dateNaissance || data.date_acte,
               heureNaissance: data.heure_naissance || data.heureNaissance,
               communeNaissance: data.commune_naissance || (data.citizens && data.citizens.commune) || data.communeNaissance || data.commune,
               wilayaNaissance: data.wilaya_naissance || (data.citizens && data.citizens.wilaya) || data.wilayaNaissance || data.wilaya,
               fullName: data.nom_prenom || data.nom_prenom_enfant || data.fullName || (data.citizens && (data.citizens.nom_prenom || `${data.citizens.prenom} ${data.citizens.nom}`)),
               genre: data.sexe || data.genre_enfant || data.genre || (data.citizens && data.citizens.sexe),
               pereNomPrenom: data.pere_nom_prenom || data.nom_prenom_pere || data.pereNomPrenom,
               pereAge: clean(data.pere_age || data.age_pere || data.pereAge),
               pereMetier: clean(data.pere_metier || data.metier_pere || data.pereMetier),
               mereNomPrenom: data.mere_nom_prenom || data.nom_prenom_mere || data.mereNomPrenom,
               mereAge: clean(data.mere_age || data.age_mere || data.mereAge),
               mereMetier: clean(data.mere_metier || data.metier_mere || data.mereMetier),
               domicile: clean(data.domicile || (data.citizens && data.citizens.adresse)),
               domicileCommune: clean(data.domicile_commune || data.domicileCommune || (data.citizens && data.citizens.commune)),
               domicileWilaya: clean(data.domicile_wilaya || data.domicileWilaya || (data.citizens && data.citizens.wilaya)),
               dateRedaction: data.date_redaction || data.date_acte || data.dateRedaction || data.created_at,
               heureRedaction: data.heure_redaction || data.heureRedaction,
               declarePar: data.declare_par || data.notes || data.declarePar,
               officierEtatCivil: data.officier_etat_civil || data.officierEtatCivil,
               mentions_marginales: data.mentions_marginales || data.notes,
            };

            const col2 = 150;
            const lineH = 22;

            // ── HEADER ──────────────────────────────────────────────────────
            doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 0, 30, { align: 'center', width: W });

            doc.fontSize(9).font('Helvetica')
               .text("Ministère de l'Intérieur et des Collectivités Locales", marginX, 55)
               .text("Registre National de l'État Civil", marginX, 67);

            let y = 100;

            doc.fontSize(20).font('Helvetica-Bold')
               .text('CERTIFICAT DE NAISSANCE', 0, y, { align: 'center', width: W });
            y += 24;
            doc.fontSize(8).font('Helvetica')
               .text('Copie électronique', 0, y, { align: 'center', width: W });
            y += 12;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#b91c1c')
               .text('EXEMPLAIRE EN GROS', 0, y, { align: 'center', width: W });
            y += 28;

            doc.fontSize(10).font('Helvetica').fillColor(black);

            // N° acte (left column)
            doc.font('Helvetica-Bold').text("N° de l'acte", marginX, y);
            doc.font('Helvetica').text(v(d.numeroChahada, '.....'), marginX, y + 14);

            // le jour
            doc.font('Helvetica-Bold').text("le jour : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.dateNaissance, ''), { continued: true })
               .text(' ............................................');
            y += 35;

            doc.font('Helvetica-Bold').text("à l'heure de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.heureNaissance, ''), { continued: true })
               .text(' ......................................................................');
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("est né(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, ''), { continued: true })
               .text(' ..........................................................');
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("commune de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, ''), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.wilayaNaissance, ''));
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("dénommé(e) : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.fullName, ''), { continued: true })
               .text(' ................................................................................');
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("sexe : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.genre, ''), { continued: true })
               .text(' ....................................................................................');
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("fils / fille de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.pereNomPrenom, '...............'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.pereAge, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.pereMetier, '..............'));
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("et de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.mereNomPrenom, '...............'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.mereAge, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.mereMetier, '.............'));
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("domicilié(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.domicile, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  commune de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileCommune, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileWilaya, ''));
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("dressé le : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.dateRedaction, ''), { continued: true })
               .font('Helvetica-Bold').text("  à heures : ", { continued: true })
               .font('Helvetica').text(v(d.heureRedaction, '....'));
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("sur déclaration faite par Madame/Monsieur : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.declarePar, ''));
            y += lineH;

            doc.font('Helvetica-Bold').text("lecture faite, a signé avec nous : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.officierEtatCivil, ''), { continued: true })
               .font('Helvetica-Bold').text("  officier d'état civil à la commune.");
            y += lineH + 10;

            // Mentions marginales
            doc.font('Helvetica-Bold').text('Mentions marginales : ', col2, y);
            y += lineH;
            if (d.mentions_marginales) {
               doc.font('Helvetica').text(d.mentions_marginales, col2, y);
            }
            y += lineH + 5;
            for (let i = 0; i < 5; i++) {
               doc.text('........................................................................................................................................', col2, y);
               y += 18;
            }

            y += 15;
            doc.font('Helvetica-Bold').text(`Fait à Mostaganem le  ${formatDate(new Date())}`, W - 220, y);

            // Temporarily set bottom margin to 0 for footer to prevent auto page break
            doc.page.margins.bottom = 0;

            const H = 841.89;
            const footerY = H - 95;
            doc.fontSize(8).font('Helvetica').fillColor(gray)
               .text(`1- En toutes lettres  ${v(d.fullName, '')}`, marginX, footerY)
               .text(`2- Nom et Prénom de l'enfant  ${v(d.fullName, '')}`, marginX, footerY + 12);

            doc.fillColor(black).font('Helvetica-Bold').fontSize(8)
               .text("Extrait du Registre National de l'État Civil", marginX, footerY + 30)
               .text('Référence  7 M.G.', marginX, footerY + 42);

            doc.end();
         } catch (error) {
            reject(error);
         }
      });
   }

   // ═══════════════════════════════════════════════════════════════════════════
   //  ACTE DE NAISSANCE – ARABIC (true RTL)
   // ═══════════════════════════════════════════════════════════════════════════

   static generateActeNaissanceArabic(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({
               size: 'A4',
               margins: { top: 30, bottom: 30, left: 40, right: 40 },
               bufferPages: true,
            });

            const fontPath = path.join(__dirname, '../../fonts/NotoSansArabic-Regular.ttf');
            doc.registerFont('ArabicFont', fontPath);

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const black = '#000000';
            const gray = '#666666';
            const W = 595.28;
            const H = 841.89;
            const marginX = 40;
            const contentW = W - marginX * 2;

            // ── Normalise DB row (direct column names from actes_naissance) ──
            const d = {
               numeroActe: data.numero_acte || '',
               dateNaissance: data.date_naissance || '',
               heureNaissance: data.heure_naissance || '',
               communeNaissance: data.commune_naissance || '',
               wilayaNaissance: data.wilaya_naissance || '',
               nomPrenomEnfant: data.nom_prenom_enfant || '',
               genreEnfant: data.genre_enfant || '',
               nomPrenomPere: data.nom_prenom_pere || '',
               agePere: clean(data.age_pere) || '',
               metierPere: clean(data.metier_pere) || '',
               nomPrenomMere: data.nom_prenom_mere || '',
               ageMere: clean(data.age_mere) || '',
               metierMere: clean(data.metier_mere) || '',
               domicile: clean(data.domicile) || '',
               domicileCommune: clean(data.domicile_commune) || '',
               domicileWilaya: clean(data.domicile_wilaya) || '',
               dateRedaction: data.date_redaction || '',
               heureRedaction: data.heure_redaction || '',
               declarePar: data.declare_par || '',
               officierEtatCivil: data.officier_etat_civil || '',
               mentionsMarginales: data.mentions_marginales || '',
            };

            const dots = (n = 20) => '.'.repeat(n);
            const fv = (val, dotLen = 20) => val ? String(val) : dots(dotLen);

            // ── HEADER ──────────────────────────────────────────────────────
            doc.fillColor(black).fontSize(14).font('ArabicFont')
               .text(ar('الجمهورية الجزائرية الديمقراطية الشعبية'), marginX, 30, { align: 'center', width: contentW });

            doc.fontSize(10).font('ArabicFont')
               .text(ar('وزارة الداخلية والجماعات المحلية'), marginX, 54, { align: 'center', width: contentW });

            doc.fontSize(10).font('ArabicFont')
               .text(ar('السجل الوطني للحالة المدنية'), marginX, 70, { align: 'center', width: contentW });

            // ── TITLE ───────────────────────────────────────────────────────
            let y = 96;
            doc.fontSize(20).font('ArabicFont')
               .text(ar('شهادة الميلاد'), marginX, y, { align: 'center', width: contentW });
            y += 30;

            doc.fontSize(9).font('ArabicFont')
               .text(ar('نسخة الكترونية'), marginX, y, { align: 'center', width: contentW });
            y += 22;

            // ── TWO-COLUMN SECTION ──────────────────────────────────────────
            // Left block (acts like the right side in Arabic RTL doc):
            //   رقم الشهادة + number + date placeholder (../../....)
            // Right block (acts like left side): the date/time/place fields

            const lineH = 20;
            const lineGap = 3;

            // Left stub column (numero + date placeholder)
            const stubX = marginX;          // left edge
            const stubW = 90;               // narrow left column
            const fieldsX = stubX + stubW + 10;
            const fieldsW = contentW - stubW - 10;

            // Row 1 – رقم الشهادة | في يوم
            doc.fontSize(10).font('ArabicFont').fillColor(black);

            // Left column labels (stacked)
            doc.text(ar('رقم الشهادة'), stubX, y, { width: stubW, align: 'center' });
            doc.text(fv(d.numeroActe, 8), stubX, y + lineH, { width: stubW, align: 'center' });
            doc.text(ar('../../....'), stubX, y + lineH * 2, { width: stubW, align: 'center' });

            // Right column – في يوم / الساعة / ولد(ت)بـ
            doc.text(
               ar(`في يوم ${fv(d.dateNaissance, 30)}`),
               fieldsX, y, { width: fieldsW, align: 'right' }
            );
            doc.text(
               ar(`على الساعة ${fv(d.heureNaissance, 15)} ولد(ت) بـ ${fv(d.communeNaissance, 15)}`),
               fieldsX, y + lineH, { width: fieldsW, align: 'right' }
            );
            doc.text(
               ar(`بلدية ${fv(d.communeNaissance, 20)} ولاية ${fv(d.wilayaNaissance, 20)}`),
               fieldsX, y + lineH * 2, { width: fieldsW, align: 'right' }
            );

            y += lineH * 3 + lineGap * 2;

            // ── BODY ROWS (full width, right-aligned) ───────────────────────
            const row = (text) => {
               doc.fontSize(10).font('ArabicFont').fillColor(black)
                  .text(ar(text), marginX, y, { width: contentW, align: 'right' });
               y += lineH + lineGap;
            };

            row(`المسمى(ة) ${fv(d.nomPrenomEnfant, 50)}`);
            row(`الجنس ${fv(d.genreEnfant, 55)}`);
            row(`ابن(ة) ${fv(d.nomPrenomPere, 20)} عمره ${fv(d.agePere, 8)} مهنة ${fv(d.metierPere, 15)}`);
            row(`و ${fv(d.nomPrenomMere, 20)} عمرها ${fv(d.ageMere, 8)} مهنتها ${fv(d.metierMere, 15)}`);
            row(`الساكنين ${fv(d.domicile, 15)} بلدية ${fv(d.domicileCommune, 10)} ولاية ${fv(d.domicileWilaya, 10)}`);
            row(`حرر في ${fv(d.dateRedaction, 20)} على الساعة ${fv(d.heureRedaction, 10)}`);
            row(`بإعلان ادلى به السيد(ة) ${fv(d.declarePar, 40)}`);
            row(dots(80));
            row(`وبعد التلاوة وقع معنا نحن ${fv(d.officierEtatCivil, 25)} ضابط الحالة المدنية بالبلدية`);

            y += 4;

            // ── MENTIONS MARGINALES ──────────────────────────────────────────
            doc.fontSize(10).font('ArabicFont').fillColor(black)
               .text(ar('البيانات الهامشية'), marginX, y, { width: contentW, align: 'right' });
            y += lineH;

            const marginalesText = d.mentionsMarginales
               ? ar(d.mentionsMarginales)
               : dots(80);

            doc.text(marginalesText, marginX, y, { width: contentW, align: 'right' });
            y += lineH;


            // ── DATE / CITY ──────────────────────────────────────────────────
            y += 10;
            doc.fontSize(10).font('ArabicFont').fillColor(black)
               .text(ar(`حررت بـ مستغانم في ${formatDate(new Date())}`), marginX, y, { align: 'left', width: contentW });

            // ── FOOTER ───────────────────────────────────────────────────────
            doc.page.margins.bottom = 0;
            const footerY = H - 90;

            doc.fontSize(8).font('ArabicFont').fillColor(gray)
               .text(ar('الكتابة السابقة للاسم واللقب بالأحرف اللاتينية'), marginX, footerY - 22, { align: 'right', width: contentW })
               .text(dots(60), marginX, footerY - 10, { align: 'right', width: contentW })
               .text(ar(`١- بكامل الحروف`), marginX, footerY, { align: 'right', width: contentW })
               .text(ar(`٢- اسم ولقب الولد`), marginX, footerY + 12, { align: 'right', width: contentW });

            doc.fillColor(black).font('ArabicFont').fontSize(8)
               .text(ar('مستخرج من السجل الوطني للحالة المدنية'), marginX, footerY + 28, { align: 'right', width: contentW })
               .text(ar('المرجع ج م 7'), marginX, footerY + 40, { align: 'right', width: contentW });

            doc.end();
         } catch (error) {
            reject(error);
         }
      });
   }

   static generateCitizenPDF(requestRow) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument();
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            doc.fillColor('#000000');
            doc.fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
            doc.fontSize(14).font('Helvetica').text('Fiche de Traitement de Demande', 50, 65);
            doc.fontSize(10).text(`Ref: ${requestRow.id ?? 'N/A'}`, 450, 40).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 450, 55);
            doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text('INFORMATIONS DU CITOYEN', 50, 130);
            doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

            const citizenInfo = [
               ['Nom complet:', `${requestRow.citizen_first_name ?? ''} ${requestRow.citizen_last_name ?? ''}`.trim()],
               ['Email:', requestRow.citizen_email ?? 'Non spécifié'],
               ['NIN:', requestRow.citizen_nin ?? 'Non spécifié'],
               ['Adresse:', requestRow.citizen_address ?? 'Non spécifiée'],
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
            doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold').text('DÉTAILS DE LA DEMANDE', 50, y);
            doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');

            const requestInfo = [
               ['Sujet:', requestRow.subject ?? 'Non spécifié'],
               ['Description:', requestRow.description ?? 'Aucune description'],
               ['Assigné à:', requestRow.assigned_employee_name ?? 'Non spécifié'],
               ['Date:', requestRow.created_at ? new Date(requestRow.created_at).toLocaleDateString('fr-FR') : 'Non spécifiée'],
               ['Statut:', requestRow.status ?? 'En attente'],
            ];
            y += 40;
            doc.fontSize(11).font('Helvetica-Bold');
            for (const [label, value] of requestInfo) {
               doc.fillColor('#4b5563').text(label, 50, y);
               doc.fillColor('#1f2937').font('Helvetica');
               if (label === 'Description:') { doc.text(value, 200, y, { width: 362 }); y += 40; }
               else { doc.text(value, 200, y); y += 25; }
               doc.font('Helvetica-Bold');
            }

            doc.rect(0, 750, 612, 42).fill('#f3f4f6');
            doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
               .text('Document généré par Baladiya Digital', 50, 765)
               .text('© 2026 Administration Municipale', 50, 780);

            doc.end();
         } catch (error) { reject(error); }
      });
   }

   static generateNotificationPDF(employeeInfo, notificationData) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument();
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            doc.fillColor('#000000').fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
            doc.fontSize(14).font('Helvetica').text('Notification', 50, 65);
            doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text('DÉTAILS DE LA NOTIFICATION', 50, 130);
            doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

            const fields = [
               ['Titre:', notificationData.title ?? 'Non spécifié'],
               ['Message:', notificationData.message ?? 'Aucun message'],
               ['Type:', notificationData.type ?? 'Non spécifié'],
               ['Service:', notificationData.service ?? 'Général'],
            ];
            let y = 170;
            doc.fontSize(11).font('Helvetica-Bold');
            for (const [label, value] of fields) {
               doc.fillColor('#4b5563').text(label, 50, y);
               doc.fillColor('#1f2937').font('Helvetica');
               if (label === 'Message:') { doc.text(value, 200, y, { width: 362 }); y += 40; }
               else { doc.text(value, 200, y); y += 25; }
               doc.font('Helvetica-Bold');
            }
            doc.end();
         } catch (error) { reject(error); }
      });
   }

   static generateCarteSejour(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 30, left: 40, right: 40 } });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const W = 595;
            const black = '#000000';

            const fv = (val, fallback = '...............') => (val ? String(val) : fallback);
            const fd = (d) => {
               if (!d) return '../../..';
               const dt = new Date(d);
               return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
            };

            const fullName = fv(data.fullName || data.nom_prenom || `${data.firstName || data.citizenFirstName || ''} ${data.lastName || data.citizenLastName || ''}`.trim());
            const dateNaiss = fv(data.date_naissance || data.dateNaissance || '');
            const lieuNaiss = fv(data.commune_naissance || data.communeNaissance || data.lieu_naissance || '');
            const adresse = fv(data.domicile || data.adresse || data.citizen_address || '');
            const nationalite = fv(data.nationalite || data.citizen_nationalite || 'Algérienne');
            const profession = fv(data.profession || data.citizen_profession || '');
            const wilaya = fv(data.wilaya || data.domicile_wilaya || 'Mostaganem');
            const daira = fv(data.daira || data.domicile_daira || wilaya);
            const commune = fv(data.commune || data.domicile_commune || wilaya);
            const today = fd(new Date());

            doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 40, 18, { align: 'center', width: W - 80 });
            doc.fontSize(11).font('Helvetica')
               .text("Ministère de l'Intérieur", 40, 38, { align: 'center', width: W - 80 });

            let y = 100;
            doc.fillColor(black).fontSize(11).font('Helvetica-Bold')
               .text('Wilaya de : ', 40, y, { continued: true }).font('Helvetica').text(wilaya);
            y += 20;
            doc.font('Helvetica-Bold').text('Daïra de : ', 40, y, { continued: true }).font('Helvetica').text(daira);
            y += 20;
            doc.font('Helvetica-Bold').text('Commune de : ', 40, y, { continued: true }).font('Helvetica').text(commune);
            y += 35;

            doc.rect(120, y, W - 240, 40).stroke(black);
            doc.fillColor(black).fontSize(18).font('Helvetica-Bold')
               .text('CERTIFICAT DE RÉSIDENCE', 120, y + 8, { align: 'center', width: W - 240 });
            y += 80;

            doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
               .text('Nous, ', 40, y, { continued: true })
               .font('Helvetica').text('Ould Abed Mechri ..................................................................................................................');
            y += 18;
            doc.font('Helvetica-Bold')
               .text("Président de l'Assemblée Populaire Communale de la commune de Mostaganem ", 40, y, { continued: true })
               .font('Helvetica').text('....................');
            y += 35;

            doc.fontSize(13).font('Helvetica-Bold').fillColor(black).text('Attestons que :', 40, y, { align: 'center', width: W - 80 });
            y += 40;

            doc.font('Helvetica-Bold').text('Monsieur / Madame : ', 40, y, { continued: true })
               .font('Helvetica').text(fullName, { continued: true })
               .text(' ......................................................................');
            y += 25;

            doc.font('Helvetica-Bold').text('Né(e) à : ', 40, y, { continued: true })
               .font('Helvetica').text(fv(lieuNaiss, '....................'), { continued: true })
               .font('Helvetica-Bold').text('  le : ', { continued: true })
               .font('Helvetica').text(fv(dateNaiss, '....................'));
            y += 25;

            doc.font('Helvetica-Bold').text('Nationalité : ', 40, y, { continued: true })
               .font('Helvetica').text(nationalite, { continued: true })
               .font('Helvetica-Bold').text('  Profession : ', { continued: true })
               .font('Helvetica').text(fv(profession, '....................'));
            y += 25;

            doc.font('Helvetica-Bold').text('Domicile : ', 40, y, { continued: true })
               .font('Helvetica').text(adresse, { continued: true })
               .text(' ......................................................................');
            y += 40;

            doc.fontSize(11).font('Helvetica').fillColor(black)
               .text('Réside à la même adresse depuis plus de six (6) mois', 40, y, { width: W - 80 });
            y += 40;
            doc.text("Cette attestation lui a été délivrée pour être produite dans la limite permise par la loi.", 40, y, { width: W - 80 });
            y += 40;
            doc.text(`Fait à ${commune}, le ${today}`, 40, y);
            y += 40;
            doc.text("L'objet de cette attestation est la justification du domicile.", 40, y, { width: W - 80 });
            y += 40;
            doc.fontSize(10).font('Helvetica').fillColor(black)
               .text("(1) La validité de la présente attestation ne peut excéder six (6) mois.", 40, y, { width: W - 80 });

            doc.end();
         } catch (err) { reject(err); }
      });
   }

   static generateOrdreVersement(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', err => reject(err));

            const W = doc.page.width;
            const L = 50;
            const R = W - 50;
            const CW = R - L;

            const d = {
               wilaya: data.wilaya || 'DE MOSTAGANEM',
               daira: data.daira || 'DE MOSTAGANEM',
               commune: data.commune || 'DE MOSTAGANEM',
               numero: data.numero || (data.id ? data.id.substring(0, 8).toUpperCase() : '131'),
               date: data.date || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
               nom: data.fullName || `${data.citizenFirstName || data.firstName || ''} ${data.citizenLastName || data.lastName || ''}`.trim() || 'CHERIFI MERIEM',
               projet: data.projet || 'AUTORISATION DE VOIRIE',
               montant: data.montant || '3000.00',
               montantLettre: data.montantLettre || 'TROIS MILLE DINARS',
            };

            const uc = (s) => (typeof s === 'string' ? s.toUpperCase() : s);
            const prefix = (s, p) => (typeof s === 'string' && !s.startsWith(p) ? `${p}${s}` : s);
            d.wilaya = uc(prefix(d.wilaya, 'DE '));
            d.daira = uc(prefix(d.daira, 'DE '));
            d.commune = uc(prefix(d.commune, 'DE '));

            doc.fontSize(9).font('Helvetica')
               .text('REPUBLIQUE ALGERIENNE DEMOCRATIQUE & POPULAIRE', L, 45, { align: 'center', width: CW });
            doc.fontSize(8.5)
               .text(`WILAYA    ${d.wilaya}`, L, 65)
               .text(`DAIRA     ${d.daira}`, L, 78)
               .text(`COMMUNE   ${d.commune}`, L, 91)
               .text(`N°  ........${d.numero}........2026`, L, 104);
            doc.fontSize(10).font('Helvetica-Bold')
               .text(d.date, 0, 78, { align: 'right', width: W - 50 });

            doc.fontSize(18).font('Helvetica-Bold')
               .text('Ordre De Versement', L, 130, { align: 'center', width: CW, underline: true });

            const tableTop = 175;
            const col1W = 140, col2W = 240, col3W = CW - 140 - 240;
            const headerH = 35, dataRowH = 55;

            const drawCell = (x, y, w, h, text, opts = {}) => {
               doc.rect(x, y, w, h).stroke('#000');
               const tOpts = { width: w - 10, align: opts.align || 'center', lineBreak: true };
               doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.fontSize || 9);
               const tY = y + (h - doc.heightOfString(text, tOpts)) / 2;
               doc.text(text, x + 5, tY, tOpts);
            };

            drawCell(L, tableTop, col1W, headerH, 'NOM\n&\nPRENOM', { bold: true, fontSize: 8.5 });
            drawCell(L + col1W, tableTop, col2W, headerH, 'PROJET', { bold: true });
            drawCell(L + col1W + col2W, tableTop, col3W, headerH, 'MONTANT', { bold: true });

            const dataRowY = tableTop + headerH;
            drawCell(L, dataRowY, col1W, dataRowH, d.nom, { fontSize: 8 });
            drawCell(L + col1W, dataRowY, col2W, dataRowH, d.projet.toUpperCase(), { bold: true });

            doc.rect(L + col1W + col2W, dataRowY, col3W, dataRowH).stroke('#000');
            doc.font('Helvetica-Bold').fontSize(13)
               .text(d.montant, L + col1W + col2W + 5, dataRowY + 8, { width: col3W - 10, align: 'center' });
            doc.font('Helvetica').fontSize(8)
               .text(d.montantLettre, L + col1W + col2W + 5, dataRowY + 28, { width: col3W - 10, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(11)
               .text('LE DIRECTEUR', L, dataRowY + dataRowH + 50, { align: 'center', width: CW });

            doc.end();
         } catch (err) { reject(err); }
      });
   }
}

export default PDFService;