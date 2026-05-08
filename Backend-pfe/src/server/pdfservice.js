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
            doc.fontSize(26).font('Helvetica-Bold')
               .text('CERTIFICAT DE NAISSANCE', margin + 10, y, { align: 'center', width: W - (margin + 10) * 2 });
            y += 32;

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
            drawField('demeurant à  ', v(d.domicileCommune), lx, fullW * 0.55, y);
            drawField('commune  ', v(d.domicileCommune), lx + fullW * 0.55, fullW * 0.2, y);
            drawField('wilaya  ', v(d.domicileWilaya, '///'), lx + fullW * 0.75, fullW * 0.25, y);
            y += rowH + 4;

            // ── dressé à ─────────────────────────────────────────────────────
            drawField('Dressé à  ', v(d.communeNaissance), lx, fullW * 0.55, y);
            drawField("à l'heure de  ", v(d.heureRedaction), lx + fullW * 0.55, fullW * 0.45, y);
            y += rowH + 4;

            // ── déclarant ────────────────────────────────────────────────────
            drawField('sur déclaration de M./Mme  ', v(d.declarePar), lx, fullW, y);
            y += rowH + 4;

            // ── blank row ────────────────────────────────────────────────────
            doc.moveTo(lx, y + rowH - 4).lineTo(rEdge, y + rowH - 4).lineWidth(0.8).stroke(black);
            y += rowH + 4;

            // ── officier ─────────────────────────────────────────────────────
            drawField('Après lecture, signé avec nous  ', v(d.officierEtatCivil), lx, fullW * 0.5, y);
            drawField("Officier de l'État Civil de la commune de  ", v(d.communeNaissance), lx + fullW * 0.5, fullW * 0.5, y);
            y += rowH + 10;
            doc.fontSize(10).font('Helvetica').text(`Fait à : ${v(d.domicileCommune)}`, lx, y);
            y += 14;
            doc.text(`Le : ${new Date().toLocaleDateString()}`, lx, y);
            y += 25;
            doc.font('Helvetica-Bold').text('Mentions marginales :', lx, y, { underline: true });
            y += 16;
            doc.font('Helvetica').fontSize(9).text(d.marginalNotes || 'NÉANT', lx + 10, y, { width: fullW - 10 });
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
            const doc = new PDFDocument({ size: 'A4' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            const W = 595;
            doc.rect(0, 0, W, 90).fill('#1e3a5f');
            doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold')
               .text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 50, 18, { align: 'center', width: W - 100 });
            doc.fillColor('#1f2937').fontSize(22).font('Helvetica-Bold')
               .text('CARTE DE RÉSIDENCE', 50, 105, { align: 'center', width: W - 100 });
            doc.end();
         } catch (err) { reject(err); }
      });
   }
}

export default PDFService;