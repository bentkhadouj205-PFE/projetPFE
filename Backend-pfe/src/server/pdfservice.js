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
               if (!d) return '../../..';
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
               heureRedaction: data.heure_redaction ?? data.heureRedaction ?? '......',
               declarePar: data.declare_par ?? data.declarePar,
               officierEtatCivil: data.officier_etat_civil ?? data.officierEtatCivil,
               fullNameLatin: data.full_name_latin ?? data.fullNameLatin ?? '',
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
            y += 30;

            const contentFontSize = 9;
            doc.fontSize(contentFontSize).font('Helvetica').fillColor(black);
            const lineH = 20;
            const col1 = marginX;
            const col2 = 230;
            const col3 = 400;

            // Row 1: N° de l'acte | le jour
            doc.font('Helvetica-Bold').text("N° de l'acte : ", col1, y, { continued: true })
               .font('Helvetica').text(v(d.numeroChahada, '...............'));
            doc.font('Helvetica-Bold').text("le jour : ", col2, y, { continued: true })
               .font('Helvetica').text(v(formatDate(d.dateNaissance), '...............'));
            y += 14;

            // Row 2: Dots under N° | date template under le jour
            doc.text("........................................", col1, y);
            doc.text("..../..../........", col2 + 40, y);
            y += 20;

            // Row 3: à l'heure de | est né(e) à
            doc.font('Helvetica-Bold').text("à l'heure de : ", col1, y, { continued: true })
               .font('Helvetica').text(v(formatTime(d.heureNaissance), '........'));
            doc.font('Helvetica-Bold').text("est né(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, '..............................'));
            y += lineH;

            // Row 4: commune de | wilaya de
            doc.font('Helvetica-Bold').text("commune de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.communeNaissance, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.wilayaNaissance, '....................'));
            y += lineH + 5;

            // Row 5: dénommé(e)
            doc.font('Helvetica-Bold').text("dénommé(e) : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.fullName, '..................................................'));
            y += lineH;

            // Row 6: sexe
            doc.font('Helvetica-Bold').text("sexe : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.genre, '..........'));
            y += lineH;

            // Row 7: fils/fille + âge + profession
            doc.font('Helvetica-Bold').text("fils / fille de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.pereNomPrenom, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.pereAge, '....'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.pereMetier, '....................'));
            y += lineH;

            // Row 8: et de + âge + profession
            doc.font('Helvetica-Bold').text("et de : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.mereNomPrenom, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  âge : ", { continued: true })
               .font('Helvetica').text(v(d.mereAge, '....'), { continued: true })
               .font('Helvetica-Bold').text("  profession : ", { continued: true })
               .font('Helvetica').text(v(d.mereMetier, '....................'));
            y += lineH;

            // Row 9: domicilié(e) à + commune + wilaya
            doc.font('Helvetica-Bold').text("domicilié(e) à : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.domicile, '....................'), { continued: true })
               .font('Helvetica-Bold').text("  commune de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileCommune, '..........'), { continued: true })
               .font('Helvetica-Bold').text("  wilaya de : ", { continued: true })
               .font('Helvetica').text(v(d.domicileWilaya, '..........'));
            y += lineH;

            // Row 10: dressé le + à + heures
            doc.font('Helvetica-Bold').text("dressé le : ", col2, y, { continued: true })
               .font('Helvetica').text(v(formatDate(new Date()), '..........'), { continued: true })
               .font('Helvetica-Bold').text("  à : ", { continued: true })
               .font('Helvetica').text(v(d.heureRedaction, '....'), { continued: true })
               .font('Helvetica-Bold').text("  heures", { continued: true });
            y += lineH;

            // Row 11: sur déclaration faite par Madame/Monsieur
            doc.font('Helvetica-Bold').text("sur déclaration faite par Madame/Monsieur : ", col1, y, { continued: true })
               .font('Helvetica').text(v(d.declarePar, '..................................................'));
            y += 12;
            doc.text("................................................................................................................................................", col1, y);
            y += 20;

            // Row 12: lecture faite, a signé avec nous
            doc.font('Helvetica-Bold').text("lecture faite, a signé avec nous : ", col2, y, { continued: true })
               .font('Helvetica').text(v(d.officierEtatCivil, '....................'), { continued: true })
               .font('Helvetica-Bold').text(" officier d'état civil à la commune : ", { continued: true })
               .font('Helvetica').text(v(d.domicileCommune, '....................'));
            y += 30;

            // Mentions marginales (11 lines)
            doc.font('Helvetica-Bold').text('Mentions marginales :', marginX, y);
            y += 15;
            for (let i = 0; i < 11; i++) {
               doc.text("....................................................................................................................................................................................", marginX, y);
               y += 14;
            }

            // Bottom Right: Fait à Mostaganem le
            y += 10;
            doc.font('Helvetica-Bold').text(`Fait à Mostaganem le : ${formatDate(new Date())}`, W - 220, y);

            // Bottom Left: Latin Transcription and Registry info
            const footerY = H - 85;
            doc.fontSize(8).font('Helvetica').fillColor(gray);
            doc.text(`1- En toutes lettres : ${v(d.fullNameLatin)}`, marginX, footerY);
            doc.text(`2- Nom et Prénom de l'enfant : ${v(d.fullNameLatin)}`, marginX, footerY + 12);
            
            doc.fillColor(black).font('Helvetica-Bold')
               .text('Extrait du Registre National de l\'État Civil', marginX, footerY + 30);
            doc.text('Référence : 7 M.G.', marginX, footerY + 42);

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
            const fullName    = v(data.fullName || data.nom_prenom || `${data.firstName || data.citizenFirstName || ''} ${data.lastName || data.citizenLastName || ''}`.trim());
            const dateNaiss   = v(formatDate(data.date_naissance || data.dateNaissance));
            const lieuNaiss   = v(data.lieu_naissance || data.lieuNaissance || data.communeNaissance || data.commune_naissance);
            const adresse     = v(data.adresse || data.citizen_address);
            const nationalite = v(data.nationalite || data.citizen_nationalite || 'Algérienne');
            const profession  = v(data.profession || data.citizen_profession || '');
            const wilaya      = v(data.wilaya || data.domicile_wilaya || 'Mostaganem');
            const daira       = v(data.daira || data.domicile_daira || wilaya);
            const commune     = v(data.commune || data.domicile_commune || wilaya);
            const president   = v(data.president_name || data.presidentName || 'L\'Officier de l\'État Civil');
            const today       = formatDate(new Date());

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

            // ── helper: draw a row with label + dotted line + value ───────────
            const drawRow = (label, value, yPos) => {
               doc.fontSize(11).font('Helvetica-Bold').fillColor(black).text(label, 40, yPos, { lineBreak: false });
               const lblW = doc.widthOfString(label) + 6;
               doc.fontSize(11).font('Helvetica').fillColor(black).text(value, 40 + lblW, yPos, { lineBreak: false });
               const valW = doc.widthOfString(value);
               const lineStart = 40 + lblW + valW + 4;
               doc.moveTo(lineStart, yPos + 14).lineTo(W - 40, yPos + 14)
                  .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();
               return yPos + 35;
            };

            // ── INTRO TEXT ────────────────────────────────────────────────────
            doc.fontSize(13).font('Helvetica-Bold').fillColor(black).text('Attestons que :', 40, y, { align: 'center', width: W - 80 });
            y += 40;

            y = drawRow('Monsieur / Madame : ', fullName, y);
            
            // ── helper: draw inline birth row ─────────────────────────────────
            const drawBirthRow = (yPos) => {
               const lbl1 = 'Né(e) à ';
               const val1 = lieuNaiss;
               const lbl2 = ' le ';
               const val2 = dateNaiss;
               
               doc.fontSize(11).font('Helvetica').fillColor(black).text(lbl1, 40, yPos, { lineBreak: false });
               const lbl1W = doc.widthOfString(lbl1) + 2;
               doc.fontSize(11).font('Helvetica').fillColor(black).text(val1, 40 + lbl1W, yPos, { lineBreak: false });
               const val1W = doc.widthOfString(val1);
               
               const midX = W * 0.60; // Place date more to the right
               
               const line1Start = 40 + lbl1W + val1W + 4;
               doc.moveTo(line1Start, yPos + 14).lineTo(midX - 10, yPos + 14)
                  .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();

               doc.fontSize(11).font('Helvetica').fillColor(black).text(lbl2, midX, yPos, { lineBreak: false });
               const lbl2W = doc.widthOfString(lbl2) + 2;
               doc.fontSize(11).font('Helvetica').fillColor(black).text(val2, midX + lbl2W, yPos, { lineBreak: false });
               const val2W = doc.widthOfString(val2);
               
               const line2Start = midX + lbl2W + val2W + 4;
               doc.moveTo(line2Start, yPos + 14).lineTo(W - 40, yPos + 14)
                  .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();
                  
               return yPos + 35;
            };
            
            y = drawBirthRow(y);
            
            // ── helper: draw inline nat/prof row ──────────────────────────────
            const drawNatProfRow = (yPos) => {
               const lbl1 = 'Nationalité ';
               const val1 = nationalite;
               const lbl2 = ' Profession ';
               const val2 = profession;
               
               doc.fontSize(11).font('Helvetica').fillColor(black).text(lbl1, 40, yPos, { lineBreak: false });
               const lbl1W = doc.widthOfString(lbl1) + 2;
               doc.fontSize(11).font('Helvetica').fillColor(black).text(val1, 40 + lbl1W, yPos, { lineBreak: false });
               const val1W = doc.widthOfString(val1);
               
               const midX = W * 0.55; 
               
               const line1Start = 40 + lbl1W + val1W + 4;
               doc.moveTo(line1Start, yPos + 14).lineTo(midX - 10, yPos + 14)
                  .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();

               doc.fontSize(11).font('Helvetica').fillColor(black).text(lbl2, midX, yPos, { lineBreak: false });
               const lbl2W = doc.widthOfString(lbl2) + 2;
               doc.fontSize(11).font('Helvetica').fillColor(black).text(val2, midX + lbl2W, yPos, { lineBreak: false });
               const val2W = doc.widthOfString(val2);
               
               const line2Start = midX + lbl2W + val2W + 4;
               doc.moveTo(line2Start, yPos + 14).lineTo(W - 40, yPos + 14)
                  .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();
                  
               return yPos + 35;
            };
            
            y = drawNatProfRow(y);
            
            // Domicile line
            doc.fontSize(11).font('Helvetica').fillColor(black).text('Domicile ', 40, y, { lineBreak: false });
            const domLblW = doc.widthOfString('Domicile ') + 2;
            doc.fontSize(11).font('Helvetica').fillColor(black).text(adresse, 40 + domLblW, y, { lineBreak: false });
            const domValW = doc.widthOfString(adresse);
            doc.moveTo(40 + domLblW + domValW + 4, y + 14).lineTo(W - 40, y + 14)
               .lineWidth(0.4).dash(1, { space: 3 }).stroke(gray).undash();
            y += 55; 

            // ── BODY TEXT ─────────────────────────────────────────────────────
            doc.fontSize(11).font('Helvetica').fillColor(black)
               .text('Réside à la même adresse depuis plus de six (6) mois', 40, y, { width: W - 80 });
            y += 50;
            
            doc.text("Cette attestation lui a été délivrée pour être produite dans la limite permise par la loi.", 40, y, { width: W - 80 });
            y += 50;

            doc.text(`Fait à ${commune}, le ${today}`, 40, y);
            y += 50;
            
            doc.text("L'objet de cette attestation est la justification du domicile.", 40, y, { width: W - 80 });
            y += 50;

            // ── VALIDITY NOTE ─────────────────────────────────────────────────
            doc.fontSize(11).font('Helvetica').fillColor(black)
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