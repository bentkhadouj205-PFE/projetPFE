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
            doc.rect(0, 0, 612, 100).fill('#1e40af');
            doc.fillColor('#ffffff');
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
            doc.rect(0, 0, 612, 100).fill('#1e40af');
            doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
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
               margins: { top: 20, bottom: 20, left: 20, right: 20 },
               bufferPages: true,
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const black = '#000000';
            const gray = '#666666';
            const W = 595.28;  // A4 width in points
            const H = 841.89;  // A4 height in points
            const margin = 20;

            // ── helpers ──────────────────────────────────────────────────────
            const formatDate = (d) => {
               if (!d) return '../../..';
               const dt = new Date(d);
               return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
            };
            const formatTime = (t) => (t ? String(t).substring(0, 5) : '......');
            const v = (val, fallback = '..........') => (val ? String(val) : fallback);

            const now = new Date();
            const today = formatDate(now);

            // Normalised data fields (mirrors emailService `d` object)
            const d = {
               numeroChahada: data.numero_chahada ?? data.numero_acte,
               dateNaissance: data.date_naissance ?? data.dateNaissance,
               heureNaissance: data.heure_naissance ?? data.heureNaissance,
               communeNaissance: data.commune_naissance ?? data.communeNaissance,
               wilayaNaissance: data.wilaya_naissance ?? data.wilayaNaissance,
               fullName: data.nom_prenom ?? data.full_name ?? data.fullName,
               genre: data.genre ?? data.sexe,
               pereNomPrenom: data.pere_nom_prenom ?? data.pereNomPrenom,
               pereAge: data.pere_age ?? data.pereAge,
               pereMetier: data.pere_metier ?? data.pereMetier,
               mereNomPrenom: data.mere_nom_prenom ?? data.mereNomPrenom,
               mereAge: data.mere_age ?? data.mereAge,
               mereMetier: data.mere_metier ?? data.mereMetier,
               domicileCommune: data.domicile_commune ?? data.domicileCommune,
               domicileWilaya: data.domicile_wilaya ?? data.domicileWilaya,
               heureRedaction: data.heure_redaction ?? data.heureRedaction,
               declarePar: data.declare_par ?? data.declarePar,
               officierEtatCivil: data.officier_etat_civil ?? data.officierEtatCivil,
               marginalNotes: data.marginal_notes ?? data.marginalNotes,
               fullNameLatin: data.full_name_latin ?? data.fullNameLatin,
            };

            let y = margin + 18;

            // ── HEADER ───────────────────────────────────────────────────────
            doc.fontSize(8).font('Helvetica').fillColor(black)
               .text('Extrait du Registre National de l\'État Civil', margin + 10, margin + 5);
            doc.text('Référence : 7 M.G.', margin + 10, margin + 15);

            doc.fontSize(13).font('Helvetica-Bold').fillColor(black)
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
            y += 18;
            doc.fontSize(11).font('Helvetica-Bold')
               .text("Ministère de l'Intérieur et des Collectivités Locales", margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
            y += 16;
            
            y += 8;

            // Main title
             doc.fontSize(22).font('Helvetica-Bold')
                .text('Certificat de Naissance', margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
             y += 30;

             doc.fontSize(20).font('Helvetica-Bold')
                .text('CERTIFIE QUE', margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
             y += 25;

            // ── LATIN TRANSCRIPTION LINES ────────────────────────────────────
            doc.fontSize(10).font('Helvetica').fillColor(black)
               .text(`1- En toutes lettres : ${v(d.fullNameLatin)}`, margin + 10, y);
            y += 15;
            doc.text(`2- Nom et Prénom de l'enfant : ${v(d.fullNameLatin)}`, margin + 10, y);
            y += 18;

            doc.fontSize(10).font('Helvetica').fillColor(gray)
               .text('Version électronique', margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
            y += 14;

            y += 10;

            // ── helper: draw a labelled underline row ────────────────────────
            const rowH = 22;
            const lx = margin + 14;   // left content x
            const rEdge = W - margin - 14;
            const lineY = (baseY) => baseY + rowH - 4;

            const drawField = (label, value, x, fieldWidth, baseY) => {
               doc.fontSize(10).font('Helvetica').fillColor(black)
                  .text(label, x, baseY, { lineBreak: false });
               const lblW = doc.widthOfString(label) + 4;
               const valX = x + lblW;
               const valW = fieldWidth - lblW;
               // dotted underline
               doc.moveTo(valX, lineY(baseY))
                  .lineTo(valX + valW, lineY(baseY))
                  .lineWidth(0.3).dash(1, { space: 3 }).stroke(gray);
               doc.undash();
               // value text
               doc.fontSize(10).font('Helvetica').fillColor(black)
                  .text(v(value), valX + 2, baseY, { width: valW - 4, lineBreak: false });
            };

            // ── N° de l'acte  +  Le jour ─────────────────────────────────────
            const fullW = rEdge - lx;
            drawField("N° de l'acte  ", v(d.numeroChahada), lx, 160, y);
            drawField('Le jour  ', formatDate(d.dateNaissance), lx + 180, fullW - 180, y);
            y += rowH + 4;

            // ── heure + né(e) à ──────────────────────────────────────────────
            drawField("à l'heure de  ", formatTime(d.heureNaissance), lx, 180, y);
            drawField('est né(e) à  ', v(d.communeNaissance), lx + 200, fullW - 200, y);
            y += rowH + 4;

            // ── commune + wilaya ─────────────────────────────────────────────
            drawField('commune de  ', v(d.communeNaissance), lx, fullW / 2, y);
            drawField('wilaya de  ', v(d.wilayaNaissance), lx + fullW / 2, fullW / 2, y);
            y += rowH + 4;

            // ── date (repeat) + dénommé(e) ───────────────────────────────────
            drawField('', formatDate(d.dateNaissance), lx, 100, y);
            drawField('dénommé(e)  ', v(d.fullName), lx + 110, fullW - 110, y);
            y += rowH + 4;

            // ── sexe ─────────────────────────────────────────────────────────
            drawField('sexe  ', v(d.genre), lx, fullW, y);
            y += rowH + 4;

            // ── père ─────────────────────────────────────────────────────────
            drawField('fils / fille de  ', v(d.pereNomPrenom), lx, fullW * 0.55, y);
            drawField('âge  ', v(d.pereAge, '///'), lx + fullW * 0.55, fullW * 0.2, y);
            drawField('profession  ', v(d.pereMetier, '///'), lx + fullW * 0.75, fullW * 0.25, y);
            y += rowH + 4;

            // ── mère ─────────────────────────────────────────────────────────
            drawField('et de  ', v(d.mereNomPrenom), lx, fullW * 0.55, y);
            drawField('âge  ', v(d.mereAge, '///'), lx + fullW * 0.55, fullW * 0.2, y);
            drawField('profession  ', v(d.mereMetier, '///'), lx + fullW * 0.75, fullW * 0.25, y);
            y += rowH + 4;

            // ── demeure ──────────────────────────────────────────────────────
            drawField('demeurant à  ', v(d.domicile), lx, fullW, y);
            y += rowH + 4;
            drawField('commune de  ', v(d.domicileCommune), lx, fullW * 0.5, y);
            drawField('wilaya de  ', v(d.domicileWilaya), lx + fullW * 0.5, fullW * 0.5, y);
            y += rowH + 4;

            // ── dressé à ─────────────────────────────────────────────────────
            drawField('Dressé le  ', formatDate(d.dateNaissance), lx, 140, y);
            drawField('à  ', v(d.heureRedaction), lx + 150, 80, y);
            y += rowH + 4;

            // ── déclarant ────────────────────────────────────────────────────
            drawField('sur déclaration de M./Mme  ', v(d.declarePar), lx, fullW, y);
            y += rowH + 4;

            // ── blank row ────────────────────────────────────────────────────
            doc.moveTo(lx, y + rowH - 4).lineTo(rEdge, y + rowH - 4).lineWidth(0.8).stroke(black);
            y += rowH + 4;

            // ── officier ─────────────────────────────────────────────────────
            drawField("Le Président de l'Assemblée Populaire Communale de la commune de ", v(d.domicileCommune), lx, fullW, y);
            y += rowH + 20;

            doc.font('Helvetica-Bold').fontSize(10).text('Mentions marginales', lx, y);
            y += 15;
            for (let i = 0; i < 5; i++) {
                doc.moveTo(lx, y).lineTo(rEdge, y).lineWidth(0.5).stroke(black);
                y += 15;
            }
            y += 40;
            y += 6;





            // ── OFFICIAL BOX REMOVED ─────────────────────────────────────────
            y += 10;



            doc.end();
         } catch (error) {
            console.error('Error generating Acte de Naissance (FR):', error);
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
            const navy = '#1e3a5f';
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
            const president   = v(data.president_name || data.presidentName || 'Le Président de l\'APC');
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
            y = drawRow('Nous, ', president, y);
            y = drawRow('De la commune de : ', commune, y);
            y += 15;
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