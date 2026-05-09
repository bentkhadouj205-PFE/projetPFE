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

            // Data Normalization
            const d = {
               numeroChahada: data.numero_chahada ?? data.numero_acte ?? data.actNumber,
               dateNaissance: data.date_naissance ?? data.dateNaissance,
               heureNaissance: data.heure_naissance ?? data.heureNaissance,
               communeNaissance: data.commune_naissance ?? data.communeNaissance ?? data.commune,
               wilayaNaissance: data.wilaya_naissance ?? data.wilayaNaissance ?? data.wilaya,
               fullName: data.nom_prenom ?? data.full_name ?? data.fullName ?? `${data.citizenFirstName || ''} ${data.citizenLastName || ''}`.trim(),
               genre: data.genre ?? data.sexe ?? '..........',
               pereNomPrenom: data.pere_nom_prenom ?? data.pereNomPrenom,
               pereAge: data.pere_age ?? data.pereAge,
               pereMetier: data.pere_metier ?? data.pereMetier,
               mereNomPrenom: data.mere_nom_prenom ?? data.mereNomPrenom,
               mereAge: data.mere_age ?? data.mereAge,
               mereMetier: data.mere_metier ?? data.mereMetier,
               domicile: data.adresse || data.citizen_address || '',
               domicileCommune: data.domicile_commune ?? data.domicileCommune ?? data.commune,
               domicileWilaya: data.domicile_wilaya ?? data.domicileWilaya ?? data.wilaya,
               dateRedaction: data.date_redaction ?? data.dateRedaction ?? '..........',
               heureRedaction: data.heure_redaction ?? data.heureRedaction ?? '......',
               declarePar: data.declare_par ?? data.declarePar,
               officierEtatCivil: data.officier_etat_civil ?? data.officierEtatCivil,
               mentions_marginales: data.mentions_marginales ?? data.mentions_marginales,
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
               .font('Helvetica').text(".......................................................................................");
            y += 35;

            // à l'heure de
            doc.font('Helvetica-Bold').text("à l'heure de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(formatTime(d.heureNaissance), '..........................................................'));
            y += lineH + 10;

            // est né(e) à
            doc.font('Helvetica-Bold').text("est né(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(".................................................................");
            y += lineH + 10;

            // commune de | wilaya de
            doc.font('Helvetica-Bold').text("commune de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.wilayaNaissance, '....................'));
            y += lineH + 10;

            // dénommé(e)
            doc.font('Helvetica-Bold').text("dénommé(e) : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.fullName, '..............................................................'));
            y += lineH + 10;

            // sexe
            doc.font('Helvetica-Bold').text("sexe : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.genre, '..............................................................'));
            y += lineH + 10;

            // fils/fille + âge + profession
            doc.font('Helvetica-Bold').text("fils / fille de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.pereNomPrenom, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.pereAge, '....'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.pereMetier, '....................'));
            y += lineH + 10;

            // et de + âge + profession
            doc.font('Helvetica-Bold').text("et de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.mereNomPrenom, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.mereAge, '....'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.mereMetier, '....................'));
            y += lineH + 10;

            // domicilié(e) à + commune + wilaya
            doc.font('Helvetica-Bold').text("domicilié(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.domicile, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  commune de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileCommune, ''), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileWilaya, ''));
            y += lineH + 10;

            // dressé le + à  heures
            doc.font('Helvetica-Bold').text("dressé le :............... ", col2, y, { continued: true })
               .font('Helvetica').text(v(formatDate(new Date()), ''), { continued: true })
               .font('Helvetica-Bold').text("  à heures : ", { continued: true })
               .font('Helvetica').text(v(d.heureRedaction, '....'));
            y += lineH + 10;

            // Row 11: sur déclaration faite par Madame/Monsieur
            doc.font('Helvetica-Bold').text("sur déclaration faite par Madame/Monsieur : ", col2, y, { continued: true })
               .font('Helvetica').text(v.nomDeclarant || ".............................");
            y += lineH + 10;

            // Row 12: lecture faite, a signé avec nous
            doc.font('Helvetica-Bold').text("lecture faite, a signé avec nous : ", col2, y, { continued: true })
               .font('Helvetica').text((v(d.officierEtatCivil), ''), { continued: true })
               .font('Helvetica-Bold').text(" officier d'état civil à la commune.");
            y += lineH + 10;

            // Mentions marginales (11 lines)
            doc.font('Helvetica-Bold').text('Mentions marginales : ................................', col2, y);
            y += lineH + 10;
            for (let i = 0; i < 9; i++) {
               doc.text(".........................................................................................", col2, y);
               y += 20;
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
            const dateNaiss = v(formatDate(data.date_naissance || data.dateNaissance));
            const lieuNaiss = v(data.lieu_naissance || data.lieuNaissance || data.communeNaissance || data.commune_naissance);
            const adresse = v(data.adresse || data.citizen_address);
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
               .font('Helvetica').text(fullName);
            y += 18;
            doc.text(".....................................................", 40, y);
            y += 35;

            // Né(e) à + le
            doc.font('Helvetica-Bold').text('Né(e) à : ', 40, y, { continued: true })
               .font('Helvetica').text(lieuNaiss, { continued: true })
               .text(' .................... ', { continued: true })
               .font('Helvetica-Bold').text(' le : ', { continued: true })
               .font('Helvetica').text(dateNaiss, { continued: true })
               .text(' ....................');
            y += 35;

            // Nationalité + Profession
            doc.font('Helvetica-Bold').text('Nationalité : ', 40, y, { continued: true })
               .font('Helvetica').text(nationalite, { continued: true })
               .text(' .................... ', { continued: true })
               .font('Helvetica-Bold').text(' Profession : ', { continued: true })
               .font('Helvetica').text(profession, { continued: true })
               .text(' ....................');
            y += 35;

            // Domicile
            doc.font('Helvetica-Bold').text('Domicile : ', 40, y, { continued: true })
               .font('Helvetica').text(adresse);
            y += 18;
            doc.text(".................................................................................", 40, y);
            y += 55;

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
}

export default PDFService;