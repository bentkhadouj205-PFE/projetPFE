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
      const nameField = data.nom_prenom_enfant || data.nom_prenom || data.fullName || '';
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

            const d = {
               numeroChahada: data.numero_acte || data.numero_chahada || data.numeroActe || data.numeroChahada,
               dateNaissance: data.date_naissance || data.date_acte || data.dateNaissance,
               heureNaissance: data.heure_naissance || data.heureNaissance,
               communeNaissance: data.commune_naissance || data.communeNaissance || data.commune,
               wilayaNaissance: data.wilaya_naissance || data.wilayaNaissance || data.wilaya,
               // nom_prenom_enfant is the correct DB column — check it first
               fullName: data.nom_prenom_enfant || data.nom_prenom || data.fullName,
               // DB column is sexe — not genre_enfant
               genre: data.sexe || data.genre_enfant || data.genre,
               pereNomPrenom: data.pere_nom_prenom || data.nom_prenom_pere || data.pereNomPrenom,
               pereAge: clean(data.pere_age || data.age_pere || data.pereAge),
               pereMetier: clean(data.pere_metier || data.metier_pere || data.pereMetier),
               mereNomPrenom: data.mere_nom_prenom || data.nom_prenom_mere || data.mereNomPrenom,
               mereAge: clean(data.mere_age || data.age_mere || data.mereAge),
               mereMetier: clean(data.mere_metier || data.metier_mere || data.mereMetier),
               domicile: clean(data.domicile),
               domicileCommune: clean(data.domicile_commune || data.domicileCommune),
               domicileWilaya: clean(data.domicile_wilaya || data.domicileWilaya),
               dateRedaction: data.date_redaction || data.date_acte || data.created_at,
               heureRedaction: data.heure_redaction || data.heureRedaction,
               declarePar: data.declare_par || data.declarePar,
               officierEtatCivil: data.officier_etat_civil || data.officierEtatCivil,
               // DB column is marginal_notes in the query, mentions_marginales in the table
               mentions_marginales: data.mentions_marginales || data.marginal_notes,
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
            const lineH = 19;
            const lineGap = 4;

            // Normalise DB row
            const d = {
               numeroChahada: data.numero_acte || data.numero_chahada || data.numeroChahada || data.numeroActe,
               dateNaissance: data.date_naissance || (data.citizens && data.citizens.date_naissance) || data.date_naissance_enfant || data.dateNaissance || data.date_acte,
               heureNaissance: data.heure_naissance || data.heureNaissance,
               communeNaissance: data.commune_naissance || (data.citizens && data.citizens.commune) || data.communeNaissance || data.commune,
               wilayaNaissance: data.wilaya_naissance || (data.citizens && data.citizens.wilaya) || data.wilayaNaissance || data.wilaya,
               fullName: data.nom_prenom_enfant || data.nom_prenom || data.fullName || (data.citizens && (data.citizens.nom_prenom || `${data.citizens.prenom} ${data.citizens.nom}`)),
               genre: data.genre_enfant || data.sexe || data.genre || (data.citizens && data.citizens.sexe),
               pereNomPrenom: data.nom_prenom_pere || data.pere_nom_prenom || data.pereNomPrenom,
               pereAge: clean(data.age_pere || data.pere_age || data.pereAge),
               pereMetier: clean(data.metier_pere || data.pere_metier || data.pereMetier),
               mereNomPrenom: data.nom_prenom_mere || data.mere_nom_prenom || data.mereNomPrenom,
               mereAge: clean(data.age_mere || data.mere_age || data.mereAge),
               mereMetier: clean(data.mere_metier || data.mere_metier || data.mereMetier),
               domicile: clean(data.domicile || (data.citizens && data.citizens.adresse)),
               domicileCommune: clean(data.domicile_commune || data.domicileCommune || (data.citizens && data.citizens.commune)),
               domicileWilaya: clean(data.domicile_wilaya || data.domicileWilaya || (data.citizens && data.citizens.wilaya)),
               dateRedaction: data.date_redaction || data.date_acte || data.created_at || data.dateRedaction,
               heureRedaction: data.heure_redaction || data.heureRedaction,
               declarePar: data.declare_par || data.notes || data.declarePar,
               officierEtatCivil: data.officier_etat_civil || data.officierEtatCivil,
               mentions_marginales: data.mentions_marginales || data.notes || data.mentions_marginales,
               nomLatin: data.citizens
                  ? `${data.citizens.nom || ''} ${data.citizens.prenom || ''}`.trim().toUpperCase()
                  : (data.nom && data.prenom ? `${data.nom} ${data.prenom}`.trim().toUpperCase() : ''),
            };

            // Fix nested name if query was different
            if (!d.nomLatin && data.citizens && typeof data.citizens === 'object') {
               d.nomLatin = `${data.citizens.nom || ''} ${data.citizens.prenom || ''}`.trim().toUpperCase();
            }

            // ── HEADER ───────────────────────────────────────────────────────
            doc.fillColor(black).fontSize(14).font('ArabicFont')
               .text(ar('الجمهورية الجزائرية الديمقراطية الشعبية'), marginX, 30, { align: 'center', width: contentW });

            doc.fontSize(9).font('ArabicFont')
               .text(ar('وزارة الداخلية والجماعات المحلية'), marginX, 55, { align: 'right', width: contentW })
               .text(ar('السجل الوطني للحالة المدنية'), marginX, 70, { align: 'right', width: contentW });

            // ── TITLE ────────────────────────────────────────────────────────
            let y = 100;
            doc.fontSize(20).font('ArabicFont')
               .text(ar('شهادة الميلاد'), marginX, y, { align: 'center', width: contentW });
            y += 28;
            doc.fontSize(8).font('ArabicFont')
               .text(ar('نسخة الكترونية'), marginX, y, { align: 'center', width: contentW });
            y += 12;
            // Arabic part + Latin part rendered separately to avoid reshaper corruption
            const exemplaireAr = ar('نسخة كاملة');
            const exemplaireLat = '(EXEMPLAIRE EN GROS)';
            const arW = doc.fontSize(9).font('ArabicFont').widthOfString(exemplaireAr);
            const latW = doc.font('Helvetica').widthOfString(exemplaireLat);
            const totalW = arW + 6 + latW;
            const startX = marginX + (contentW - totalW) / 2;
            doc.fillColor('#b91c1c').font('Helvetica').fontSize(9)
               .text(exemplaireLat, startX, y);
            doc.font('ArabicFont').fontSize(9)
               .text(exemplaireAr, startX + latW + 6, y);
            y += 26;

            // ── TWO COLUMN LAYOUT ────────────────────────────────────────────
            const rightColX = 470;
            const rightColW = W - marginX - rightColX;
            const leftColX = marginX;
            const leftColW = rightColX - leftColX - 10;

            const startY = y;

            // ── Helper: render "label : value" on one line (RTL) ────────────
            // Arabic label is reshaped; value is printed raw (Helvetica for Latin, ArabicFont for Arabic)
            const arLine = (label, val, xPos, yPos, w) => {
               const reshapedLabel = ar(label);
               const valStr = val ? String(val) : '....................';
               const valIsArabic = isArabic(valStr);
               // Print label (right-aligned)
               doc.fontSize(10).font('ArabicFont').fillColor(black)
                  .text(reshapedLabel, xPos, yPos, { align: 'right', width: w });
               // Print value to the left of the label
               const labelW = doc.widthOfString(reshapedLabel);
               const valFont = valIsArabic ? 'ArabicFont' : 'Helvetica';
               const displayVal = valIsArabic ? ar(valStr) : valStr;
               doc.font(valFont).fontSize(10)
                  .text(displayVal, xPos, yPos, { align: 'right', width: w - labelW - 8 });
            };

            // Draw right column fields
            doc.fontSize(10).font('ArabicFont').fillColor(black);
            doc.text(ar('رقم الشهادة'), rightColX, startY, { align: 'center', width: rightColW });
            doc.font('Helvetica').text(v(d.numeroChahada, '.........'), rightColX, startY + lineH, { align: 'center', width: rightColW });
            doc.font('Helvetica').text(formatDate(d.dateNaissance) || '..../../..', rightColX, startY + lineH * 2, { align: 'center', width: rightColW });

            // Draw left column fields — labels are Arabic, values are Latin
            // Row 1: في يوم : <date>
            arLine('في يوم :', formatDate(d.dateNaissance) || '.......................................', leftColX, startY, leftColW);

            // Row 2: ولد(ت) بـ : <commune>  على الساعة : <heure>
            {
               const lbl1 = ar('ولد(ت) بـ :');
               const lbl2 = ar('على الساعة :');
               const val1 = v(d.communeNaissance, '....................');
               const val2 = v(d.heureNaissance, '....................');
               // Render from right to left: lbl1 val1 lbl2 val2
               const rowY = startY + lineH;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = leftColX + leftColW; // start from right edge
               cx -= doc.widthOfString(lbl1); doc.text(lbl1, cx, rowY);
               cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(val1); doc.text(val1, cx, rowY);
               cx -= 8; doc.font('ArabicFont'); cx -= doc.widthOfString(lbl2); doc.text(lbl2, cx, rowY);
               cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(val2); doc.text(val2, cx, rowY);
            }

            // Row 3: بلدية : <commune>  ولاية : <wilaya>
            {
               const lbl1 = ar('بلدية :');
               const lbl2 = ar('ولاية :');
               const val1 = v(d.communeNaissance, '....................');
               const val2 = v(d.wilayaNaissance, '....................');
               const rowY = startY + lineH * 2;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = leftColX + leftColW;
               cx -= doc.widthOfString(lbl1); doc.text(lbl1, cx, rowY);
               cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(val1); doc.text(val1, cx, rowY);
               cx -= 8; doc.font('ArabicFont'); cx -= doc.widthOfString(lbl2); doc.text(lbl2, cx, rowY);
               cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(val2); doc.text(val2, cx, rowY);
            }

            y = startY + lineH * 3;

            // المسمى(ة) : <name>
            arLine('المسمى(ة) :', v(d.fullName, '............................................................'), marginX, y, contentW);
            y += lineH + lineGap;

            // الجنس : <genre>
            arLine('الجنس :', v(d.genre, '............................................................'), marginX, y, contentW);
            y += lineH + lineGap;

            // ابن(ة) : <father> عمره : <age> مهنة : <job>
            {
               const rowY = y;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = marginX + contentW;
               const parts = [
                  { lbl: ar('ابن(ة) :'), val: v(d.pereNomPrenom, '....................') },
                  { lbl: ar('عمره :'), val: v(d.pereAge, '..........') },
                  { lbl: ar('مهنة :'), val: v(d.pereMetier, '....................') },
               ];
               for (const p of parts) {
                  doc.font('ArabicFont'); cx -= doc.widthOfString(p.lbl); doc.text(p.lbl, cx, rowY);
                  cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(p.val); doc.text(p.val, cx, rowY);
                  cx -= 8;
               }
            }
            y += lineH + lineGap;

            // و : <mother> عمرها : <age> مهنتها : <job>
            {
               const rowY = y;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = marginX + contentW;
               const parts = [
                  { lbl: ar('و :'), val: v(d.mereNomPrenom, '....................') },
                  { lbl: ar('عمرها :'), val: v(d.mereAge, '..........') },
                  { lbl: ar('مهنتها :'), val: v(d.mereMetier, '....................') },
               ];
               for (const p of parts) {
                  doc.font('ArabicFont'); cx -= doc.widthOfString(p.lbl); doc.text(p.lbl, cx, rowY);
                  cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(p.val); doc.text(p.val, cx, rowY);
                  cx -= 8;
               }
            }
            y += lineH + lineGap;

            // الساكنين بـ : <domicile> بلدية : <commune> ولاية : <wilaya>
            {
               const rowY = y;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = marginX + contentW;
               const parts = [
                  { lbl: ar('الساكنين بـ :'), val: v(d.domicile, '....................') },
                  { lbl: ar('بلدية :'), val: v(d.domicileCommune, '..........') },
                  { lbl: ar('ولاية :'), val: v(d.domicileWilaya, '..........') },
               ];
               for (const p of parts) {
                  doc.font('ArabicFont'); cx -= doc.widthOfString(p.lbl); doc.text(p.lbl, cx, rowY);
                  cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(p.val); doc.text(p.val, cx, rowY);
                  cx -= 8;
               }
            }
            y += lineH + lineGap;

            // حرر في : <date> على الساعة : <heure>
            {
               const rowY = y;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = marginX + contentW;
               const parts = [
                  { lbl: ar('حرر في :'), val: formatDate(d.dateRedaction) || '....................' },
                  { lbl: ar('على الساعة :'), val: v(d.heureRedaction, '..........') },
               ];
               for (const p of parts) {
                  doc.font('ArabicFont'); cx -= doc.widthOfString(p.lbl); doc.text(p.lbl, cx, rowY);
                  cx -= 4; doc.font('Helvetica'); cx -= doc.widthOfString(p.val); doc.text(p.val, cx, rowY);
                  cx -= 8;
               }
            }
            y += lineH + lineGap;

            // بإعلان ادلى به السيد(ة) : <declarant>
            arLine('بإعلان ادلى به السيد(ة) :', v(d.declarePar, '............................................................'), marginX, y, contentW);
            y += lineH + lineGap;

            doc.fontSize(10).font('ArabicFont').fillColor(black)
               .text('........................................................................................................................................', marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            // وبعد التلاوة وقع معنا نحن : <officier> ضابط الحالة المدنية بالبلدية
            {
               const rowY = y;
               doc.fontSize(10).font('ArabicFont').fillColor(black);
               let cx = marginX + contentW;
               const lbl1 = ar('وبعد التلاوة وقع معنا نحن :');
               cx -= doc.widthOfString(lbl1); doc.text(lbl1, cx, rowY);
               cx -= 4;
               const val1 = v(d.officierEtatCivil, '........................................');
               doc.font('Helvetica'); cx -= doc.widthOfString(val1); doc.text(val1, cx, rowY);
               cx -= 4;
               const lbl2 = ar('ضابط الحالة المدنية بالبلدية');
               doc.font('ArabicFont'); cx -= doc.widthOfString(lbl2); doc.text(lbl2, cx, rowY);
            }
            y += lineH + lineGap + 5;

            // Mentions marginales
            doc.font('ArabicFont').text(ar('البيانات الهامشية'), marginX, y, { align: 'right', width: contentW });
            y += lineH;
            if (d.mentions_marginales) {
               doc.text(ar(d.mentions_marginales), marginX, y, { align: 'right', width: contentW });
               y += lineH;
            }
            for (let i = 0; i < 3; i++) {
               doc.fontSize(10).font('ArabicFont').fillColor(black)
                  .text('........................................................................................................................................', marginX, y, { align: 'right', width: contentW });
               y += 16;
            }

            // ── DATE / SIGNATURE ─────────────────────────────────────────────
            y += 10;
            doc.fontSize(10).font('ArabicFont').fillColor(black)
               .text(ar('حررت بـ .. مستغانم ......في.. '), marginX, y, { align: 'left', width: contentW, continued: true })
               .font('Helvetica').text(formatDate(new Date()));

            // ── FOOTER ───────────────────────────────────────────────────────
            // Temporarily set bottom margin to 0 for footer to prevent auto page break
            doc.page.margins.bottom = 0;

            const footerY = H - 95;

            const label1 = ar('١-بكامل الحروف ');
            const label2 = ar('٢-اسم ولقب الولد ');
            const labelW1 = doc.font('ArabicFont').fontSize(8).widthOfString(label1);
            const labelW2 = doc.font('ArabicFont').fontSize(8).widthOfString(label2);

            // Print headers
            doc.font('ArabicFont').fontSize(8).fillColor(gray)
               .text(ar('الكتابة السابقة للاسم واللقب بالأحرف اللاتينية'), marginX, footerY - 24, { align: 'right', width: contentW })
               .text('.............................................................................', marginX, footerY - 12, { align: 'right', width: contentW });

            // Print labels
            doc.text(label1, marginX, footerY, { align: 'right', width: contentW })
               .text(label2, marginX, footerY + 12, { align: 'right', width: contentW });

            // Print Latin name next to labels
            doc.font('Helvetica').fontSize(8).fillColor(gray)
               .text(d.nomLatin || '....................', marginX, footerY, { align: 'right', width: contentW - labelW1 - 5 })
               .text(d.nomLatin || '....................', marginX, footerY + 12, { align: 'right', width: contentW - labelW2 - 5 });

            doc.fillColor(black).font('ArabicFont').fontSize(8)
               .text(ar('مستخرج من السجل الوطني للحالة المدنية'), marginX, footerY + 30, { align: 'right', width: contentW })
               .text(ar('المرجع م 7'), marginX, footerY + 42, { align: 'right', width: contentW });

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