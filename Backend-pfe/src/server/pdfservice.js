import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {

   // ========== EXISTING METHODS ==========

   static generateCitizenPDF(requestRow) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument();
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Header
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
               ['Adresse:', requestRow.citizen_address ?? 'Non spécifiée']
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
               ['Statut:', requestRow.status ?? 'En attente']
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
            doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text('Document généré par Baladiya Digital', 50, 765).text('© 2026 Administration Municipale', 50, 780);
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
               ['Service:', notificationData.service ?? 'Général']
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

   // ========== BIRTH CERTIFICATE - FRENCH VERSION ==========

   static async generateActeNaissance(data) {
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
            const W = 595.28;  // A4 width
            const H = 841.89;  // A4 height
            const marginX = 40;

            const v = (val, fallback = '....................') => (val ? String(val) : fallback);
            const formatDate = (d) => {
               if (!d) return '';
               const dt = new Date(d);
               return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
            };
            const formatTime = (t) => (t ? String(t).substring(0, 5) : '......');
            const clean = (val) => (!val || String(val).includes('/../') ? '' : val);

            // Data Normalization
            const d = {
               numeroChahada: data.numero_acte || data.numeroActe,
               dateNaissance: data.date_naissance || data.dateNaissance,
               heureNaissance: data.heure_naissance || data.heureNaissance,
               communeNaissance: data.commune_naissance || data.communeNaissance,
               wilayaNaissance: data.wilaya_naissance || data.wilayaNaissance,
               fullName: data.nom_prenom_enfant || data.fullName,
               genre: data.genre_enfant || data.genre,
               pereNomPrenom: data.nom_prenom_pere || data.pereNomPrenom,
               pereAge: clean(data.age_pere || data.pereAge),
               pereMetier: clean(data.metier_pere || data.pereMetier),
               mereNomPrenom: data.nom_prenom_mere || data.mereNomPrenom,
               mereAge: clean(data.age_mere || data.mereAge),
               mereMetier: clean(data.metier_mere || data.mereMetier),
               domicile: clean(data.domicile),
               domicileCommune: clean(data.domicile_commune || data.domicileCommune),
               domicileWilaya: clean(data.domicile_wilaya || data.domicileWilaya),
               dateRedaction: data.date_redaction || data.dateRedaction,
               heureRedaction: data.heure_redaction || data.heureRedaction,
               declarePar: data.declare_par || data.declarePar,
               officierEtatCivil: data.officier_etat_civil || data.officierEtatCivil,
               mentions_marginales: data.mentions_marginales,
            };

            // ── HEADER ───────────────────────────────────────────────────────
            doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 0, 30, { align: 'center', width: W });

            doc.fontSize(9).font('Helvetica')
               .text("Ministère de l'Intérieur et des Collectivités Locales", marginX, 55);
            doc.text("Registre National de l'État Civil", marginX, 67);

            let y = 100;

            // ── TITLE SECTION ────────────────────────────────────────────────
            doc.fontSize(20).font('Helvetica-Bold')
               .text('CERTIFICAT DE NAISSANCE', 0, y, { align: 'center', width: W });
            y += 24;
            doc.fontSize(8).font('Helvetica')
               .text('Copie électronique', 0, y, { align: 'center', width: W });
            y += 40;

            const contentFontSize = 10;
            doc.fontSize(contentFontSize).font('Helvetica').fillColor(black);
            const lineH = 22;
            const col1 = 40;
            const col2 = 150;
            const rightMargin = 560;

            // Left Column (Act Info)
            doc.font('Helvetica-Bold').text("N° de l'acte ", col1, y);
            doc.font('Helvetica').text(v(d.numeroChahada, '.....'), col1, y + 14);

            // Right Column
            // le jour
            doc.font('Helvetica-Bold').text("le jour : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.dateNaissance, ''), { continued: true })
               .text(' ............................................');;
            y += 35;

            // à l'heure de
            doc.font('Helvetica-Bold').text("à l'heure de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.heureNaissance, ''), { continued: true })
               .text(' ......................................................................');
            y += lineH + 10;

            // est né(e) à
            doc.font('Helvetica-Bold').text("est né(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, ''), { continued: true })
               .text(' ..........................................................');
            y += lineH + 10;
            // commune de | wilaya de
            doc.font('Helvetica-Bold').text("commune de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, ''), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.wilayaNaissance, ''), { continued: true })
               .text(' ..................................................................');
            y += lineH + 10;
            // dénommé(e)
            doc.font('Helvetica-Bold').text("dénommé(e) : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.fullName, ''), { continued: true })
               .text(' ................................................................................');
            y += lineH + 10;


            // sexe
            doc.font('Helvetica-Bold').text("sexe : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.genre, ''), { continued: true })
               .text(' ....................................................................................');
            y += lineH + 10;

            // fils/fille + âge + profession
            doc.font('Helvetica-Bold').text("fils / fille de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.pereNomPrenom, '...............'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.pereAge, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.pereMetier, '..............'), { continued: true })
               .text(' ...........');
            y += lineH + 10;

            // et de + âge + profession
            doc.font('Helvetica-Bold').text("et de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.mereNomPrenom, '...............'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.mereAge, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.mereMetier, '.............'), { continued: true })
               .text(' ..........');
            y += lineH + 10;

            // domicilié(e) à + commune + wilaya
            doc.font('Helvetica-Bold').text("domicilié(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.domicile, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  commune de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileCommune, '.............'), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileWilaya, ''), { continued: true })
               .text(' ...............');
            y += lineH + 10;

            doc.font('Helvetica-Bold').text("dressé le : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.dateRedaction, ''), { continued: true })
               .font('Helvetica-Bold').text("  à heures : ", { continued: true })
               .font('Helvetica').text(v(d.heureRedaction, '....'), { continued: true })
               .text(' ...................');
            y += lineH + 10;

            // sur déclaration
            doc.font('Helvetica-Bold').text("sur déclaration faite par Madame/Monsieur : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.declarePar, ''), { continued: true })
               .text(' ...................');
            y += lineH;

            // lecture faite
            doc.font('Helvetica-Bold').text("lecture faite, a signé avec nous : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.officierEtatCivil, ''), { continued: true })
               .font('Helvetica-Bold').text("  officier d'état civil à la commune.");
            y += lineH + 10;

            // Mentions marginales
            // Mentions marginales
            doc.font('Helvetica-Bold').text('Mentions marginales : ', col2, y);
            y += lineH;
            if (d.mentions_marginales) {
               doc.font('Helvetica').text(d.mentions_marginales, col2, y);
            }
            y += lineH + 5;
            // 5lignes de points
            for (let i = 0; i < 5; i++) {
               doc.text('........................................................................................................................................', col2, y);
               y += 18;
            }
            // Bottom Right: Fait à Mostaganem le
            y += 15;
            doc.font('Helvetica-Bold').text(`Fait à Mostaganem le  ${formatDate(new Date())}`, W - 220, y);

            // Bottom Left: Latin Transcription and Registry info
            const footerY = H - 85;
            doc.fontSize(8).font('Helvetica').fillColor(gray);
            doc.text(`1- En toutes lettres  ${v(d.fullNameLatin, '')}`, marginX, footerY);
            doc.text(`2- Nom et Prénom de l'enfant  ${v(d.fullNameLatin, '')}`, marginX, footerY + 12);

            doc.fillColor(black).font('Helvetica-Bold')
               .text('Extrait du Registre National de l\'État Civil', marginX, footerY + 30);
            doc.text('Référence  7 M.G.', marginX, footerY + 42);

            doc.end();
         } catch (error) {
            console.error('Error generating Acte de Naissance:', error);
            reject(error);
         }
      });
   }

   // ========== RESIDENCE CARD ==========

   static generateCarteSejour(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 30, left: 40, right: 40 } });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const W = 595;
            const black = '#000000';
            const gray = '#555555';

            const v = (val, fallback = '...............') => (val ? String(val) : fallback);
            const formatDate = (d) => {
               if (!d) return '../../..';
               const dt = new Date(d);
               return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
            };

            // Normalise incoming fields
            const fullName = v(data.fullName || data.nom_prenom || `${data.firstName || data.citizenFirstName || ''} ${data.lastName || data.citizenLastName || ''}`.trim());
            const dateNaiss = v(data.date_naissance || data.dateNaissance || '');
            const lieuNaiss = v(data.commune_naissance || data.communeNaissance || data.lieu_naissance || '');
            const adresse = v(data.domicile || data.adresse || data.citizen_address || '');
            const nationalite = v(data.nationalite || data.citizen_nationalite || 'Algérienne');
            const profession = v(data.profession || data.citizen_profession || '');
            const wilaya = v(data.wilaya || data.domicile_wilaya || 'Mostaganem');
            const daira = v(data.daira || data.domicile_daira || wilaya);
            const commune = v(data.commune || data.domicile_commune || wilaya);
            const president = v(data.president_name || data.presidentName || 'L\'Officier de l\'État Civil');
            const today = formatDate(new Date());

            // ── HEADER BAR ────────────────────────────────────────────────────
            doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 40, 18, { align: 'center', width: W - 80 });
            doc.fontSize(11).font('Helvetica')
               .text("Ministère de l'Intérieur", 40, 38, { align: 'center', width: W - 80 });

            // ── LOCATION HEADER ───────────────────────────────────────────────
            let y = 100;
            doc.fillColor(black).fontSize(11).font('Helvetica-Bold')
               .text(`Wilaya de : `, 40, y, { continued: true }).font('Helvetica').text(wilaya);
            y += 20;
            doc.font('Helvetica-Bold').text(`Daïra de : `, 40, y, { continued: true }).font('Helvetica').text(daira);
            y += 20;
            doc.font('Helvetica-Bold').text(`Commune de : `, 40, y, { continued: true }).font('Helvetica').text(commune);
            y += 35;

            // ── TITLE ─────────────────────────────────────────────────────────
            doc.rect(120, y, W - 240, 40).stroke(black);
            doc.fillColor(black).fontSize(18).font('Helvetica-Bold')
               .text('CERTIFICAT DE RÉSIDENCE', 120, y + 8, { align: 'center', width: W - 240 });
            y += 80;

            const drawDottedValue = (label, value, x, yPos, width) => {
               doc.font('Helvetica-Bold').text(label, x, yPos, { continued: true });
               const lblW = doc.widthOfString(label);
               doc.font('Helvetica').text(v(value, ''), x + lblW, yPos);
               const valW = doc.widthOfString(v(value, ''));
               const dotStart = x + lblW + valW + 2;
               if (dotStart < x + width) {
                  doc.text(".".repeat(Math.floor((x + width - dotStart) / 2)), dotStart, yPos);
               }
            };

            // ── INTRO TEXT ────────────────────────────────────────────────────
            doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
               .text("Nous, ", 40, y, { continued: true })
               .font('Helvetica').text("Ould Abed Mechri ..................................................................................................................");
            y += 18;
            doc.font('Helvetica-Bold').text("Président de l'Assemblée Populaire Communale de la commune de Mostaganem ", 40, y, { continued: true })
               .font('Helvetica').text("....................");
            y += 35;

            doc.fontSize(13).font('Helvetica-Bold').fillColor(black).text('Attestons que :', 40, y, { align: 'center', width: W - 80 });
            y += 40;

            // Monsieur / Madame 
            doc.font('Helvetica-Bold').text('Monsieur / Madame : ', 40, y, { continued: true })
               .font('Helvetica').text(fullName, { continued: true })
               .text(' ......................................................................');
            y += 25;

            // Né(e) à + le - 
            doc.font('Helvetica-Bold').text('Né(e) à : ', 40, y, { continued: true })
               .font('Helvetica').text(v(lieuNaiss, '....................'), { continued: true })
               .font('Helvetica-Bold').text('  le : ', { continued: true })
               .font('Helvetica').text(v(dateNaiss, '....................'));
            y += 25;

            // Nationalité + Profession
            doc.font('Helvetica-Bold').text('Nationalité : ', 40, y, { continued: true })
               .font('Helvetica').text(nationalite, { continued: true })
               .font('Helvetica-Bold').text('  Profession : ', { continued: true })
               .font('Helvetica').text(v(profession, '....................'));
            y += 25;

            // Domicile - 
            doc.font('Helvetica-Bold').text('Domicile : ', 40, y, { continued: true })
               .font('Helvetica').text(adresse, { continued: true })
               .text(' ......................................................................');
            y += 40;

            // ── BODY TEXT ─────────────────────────────────────────────────────
            doc.fontSize(11).font('Helvetica').fillColor(black)
               .text('Réside à la même adresse depuis plus de six (6) mois', 40, y, { width: W - 80 });
            y += 40;

            doc.text("Cette attestation lui a été délivrée pour être produite dans la limite permise par la loi.", 40, y, { width: W - 80 });
            y += 40;

            doc.text(`Fait à ${commune}, le ${today}`, 40, y);
            y += 40;

            doc.text("L'objet de cette attestation est la justification du domicile.", 40, y, { width: W - 80 });
            y += 40;

            // ── VALIDITY NOTE ─────────────────────────────────────────────────
            doc.fontSize(10).font('Helvetica').fillColor(black)
               .text("(1) La validité de la présente attestation ne peut excéder six (6) mois.", 40, y, { width: W - 80 });

            doc.end();
         } catch (err) {
            console.error('Error generating Carte de Résidence:', err);
            reject(err);
         }
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
               projet: data.projet || data.subject || data.type_document || "AUTORISATION DE VOIRIE",
               montant: data.montant || '3000.00',
               montantLettre: data.montantLettre || 'TROIS MILLE DINARS',
            };

            // Ensure uppercase for headers
            if (typeof d.wilaya === 'string' && !d.wilaya.startsWith('DE ')) {
               d.wilaya = `DE ${d.wilaya.toUpperCase()}`;
            } else if (typeof d.wilaya === 'string') {
               d.wilaya = d.wilaya.toUpperCase();
            }
            if (typeof d.daira === 'string' && !d.daira.startsWith('DE ')) {
               d.daira = `DE ${d.daira.toUpperCase()}`;
            } else if (typeof d.daira === 'string') {
               d.daira = d.daira.toUpperCase();
            }
            if (typeof d.commune === 'string' && !d.commune.startsWith('DE ')) {
               d.commune = `DE ${d.commune.toUpperCase()}`;
            } else if (typeof d.commune === 'string') {
               d.commune = d.commune.toUpperCase();
            }

            // Header
            doc.fontSize(9).font('Helvetica')
               .text('REPUBLIQUE ALGERIENNE DEMOCRATIQUE & POPULAIRE', L, 45, { align: 'center', width: CW });

            doc.fontSize(8.5)
               .text(`WILAYA    ${d.wilaya}`, L, 65)
               .text(`DAIRA     ${d.daira}`, L, 78)
               .text(`COMMUNE   ${d.commune}`, L, 91)
               .text(`N°  ........${d.numero}........2026`, L, 104);

            doc.fontSize(10).font('Helvetica-Bold')
               .text(d.date, 0, 78, { align: 'right', width: W - 50 });

            // Title
            doc.fontSize(18).font('Helvetica-Bold')
               .text('Ordre De Versement', L, 130, { align: 'center', width: CW, underline: true });

            // Table
            const tableTop = 175;
            const col1W = 140, col2W = 240;
            const col3W = CW - col1W - col2W;
            const headerH = 35, dataRowH = 55;

            function drawCell(x, y, w, h, text, opts = {}) {
               doc.rect(x, y, w, h).stroke('#000');
               const tOpts = { width: w - 10, align: opts.align || 'center', lineBreak: true };
               doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.fontSize || 9);
               const tY = y + (h - doc.heightOfString(text, tOpts)) / 2;
               doc.text(text, x + 5, tY, tOpts);
            }

            // Header row
            drawCell(L, tableTop, col1W, headerH, 'NOM\n&\nPRENOM', { bold: true, fontSize: 8.5 });
            drawCell(L + col1W, tableTop, col2W, headerH, 'PROJET', { bold: true });
            drawCell(L + col1W + col2W, tableTop, col3W, headerH, 'MONTANT', { bold: true });

            // Data row
            const dataRowY = tableTop + headerH;
            drawCell(L, dataRowY, col1W, dataRowH, d.nom, { fontSize: 8 });
            drawCell(L + col1W, dataRowY, col2W, dataRowH, d.projet.toUpperCase(), { bold: true });

            doc.rect(L + col1W + col2W, dataRowY, col3W, dataRowH).stroke('#000');
            doc.font('Helvetica-Bold').fontSize(13)
               .text(d.montant, L + col1W + col2W + 5, dataRowY + 8, { width: col3W - 10, align: 'center' });
            doc.font('Helvetica').fontSize(8)
               .text(d.montantLettre, L + col1W + col2W + 5, dataRowY + 28, { width: col3W - 10, align: 'center' });

            // Signature
            const sigY = dataRowY + dataRowH + 50;
            doc.font('Helvetica-Bold').fontSize(11)
               .text('LE DIRECTEUR', L, sigY, { align: 'center', width: CW });
            doc.font('Helvetica').fontSize(8.5)
               .text('ع/ رئيس المجلس الشعبي البلدي', L, sigY + 22, { align: 'center', width: CW })
               .text('و بالتفويض', L, sigY + 36, { align: 'center', width: CW })
               .text('مدير التخطيط، متابعة المشاريع التنموية والتعمير', L, sigY + 50, { align: 'center', width: CW })
               .text('إمضاه: شاشو أحمد', L, sigY + 64, { align: 'center', width: CW });

            doc.circle(W - 160, sigY + 60, 38).stroke('#666');
            doc.font('Helvetica').fontSize(7).fillColor('#888')
               .text('CACHET OFFICIEL', W - 188, sigY + 52)
               .text('COMMUNE', W - 174, sigY + 62);

            doc.end();
         } catch (err) {
            reject(err);
         }
      });
   }
}

export default PDFService;