import PDFDocument from 'pdfkit';
import { PDFDocument as LibPDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {
  
  // ========== EXISTING — Citizen Request PDF ==========
  static generateCitizenPDF(requestRow) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        doc.fontSize(14).font('Helvetica').text('Fiche de Traitement de Demande', 50, 65);
        doc.fontSize(10).text(`Ref: ${requestRow.id ?? 'N/A'}`, 450, 40).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 450, 55);

        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text('INFORMATIONS DU CITOYEN', 50, 130);
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
          y += 25;
        }

        doc.rect(0, 750, 612, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text('Document généré par Baladiya Digital', 50, 765);
        
        doc.end();
      } catch (error) { reject(error); }
    });
  }

  // ========== EXISTING — Notification PDF ==========
  static generateNotificationPDF(employeeInfo, notificationData) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        
        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text('NOTIFICATION', 50, 130);
        doc.fontSize(11).font('Helvetica').text(notificationData.message || '...', 50, 160);
        
        doc.end();
      } catch (error) { reject(error); }
    });
  }

  // ========== NEW — Acte de Naissance (Algerian Birth Certificate) ==========
  static async generateActeNaissance(data) {
    try {
      const pdfDoc = await LibPDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page;
      
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const darkBlue = rgb(0.12, 0.23, 0.37);
      const gray = rgb(0.4, 0.4, 0.4);
      const lightGray = rgb(0.85, 0.85, 0.85);
      const white = rgb(1, 1, 1);
      const black = rgb(0, 0, 0);

      // Helper to center text since pdf-lib doesn't have a native 'center' option
      const drawCenterText = (text, yPos, size, font, color) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2),
          y: yPos,
          size,
          font,
          color
        });
      };
      
      // Header
      page.drawRectangle({ x: 0, y: height - 95, width: width, height: 95, color: darkBlue });
      drawCenterText('الجمهورية الجزائرية الديموقراطية الشعبية', height - 30, 13, helveticaBold, white);
      drawCenterText('وزارة الداخلية والجماعات المحلية', height - 48, 9, helvetica, white);
      drawCenterText('السجل الوطني للحالة المدنية', height - 62, 9, helvetica, white);
      drawCenterText('شهادة الميلاد', height - 82, 20, helveticaBold, white);
      drawCenterText('نسخة الكترونية', height - 97, 9, helvetica, white);
      
      let y = height - 125;
      page.drawLine({ start: { x: 50, y: y }, end: { x: width - 50, y: y }, thickness: 1, color: gray });
      
      page.drawText(`رقم الشهادة: ${data.numero_acte || '...../...../.....'}`, { x: 50, y: y - 15, size: 9, font: helvetica, color: black });
      page.drawText(`ولد(ت) في يوم: ${data.date_naissance || '...../...../.....'}`, { x: 50, y: y - 30, size: 9, font: helvetica, color: black });
      page.drawText(`على الساعة: ${data.heure_naissance || '.....'}`, { x: 250, y: y - 30, size: 9, font: helvetica, color: black });
      page.drawText(`ببلدية: ${data.commune_naissance || '.............'}`, { x: 50, y: y - 45, size: 9, font: helvetica, color: black });
      page.drawText(`ولاية: ${data.wilaya_naissance || '.............'}`, { x: 250, y: y - 45, size: 9, font: helvetica, color: black });
      
      y = y - 75;
      page.drawText(`المسمى(ة): ${data.nom_complet || '.................................'}`, { x: 50, y: y, size: 11, font: helveticaBold, color: darkBlue });
      page.drawText(`الجنس: ${data.sexe === 'M' ? 'ذكر' : data.sexe === 'F' ? 'أنثى' : '.....'}`, { x: 50, y: y - 18, size: 9, font: helvetica, color: black });
      
      y = y - 45;
      page.drawText(`ابن(ة): ${data.pere_nom || '.................................'}`, { x: 50, y: y, size: 9, font: helvetica, color: black });
      page.drawText(`عمره: ${data.pere_age || '.....'} سنة`, { x: 50, y: y - 18, size: 9, font: helvetica, color: black });
      page.drawText(`مهنة: ${data.pere_metier || '.....................'}`, { x: 200, y: y - 18, size: 9, font: helvetica, color: black });
      
      page.drawText(`و ${data.mere_nom || '.................................'}`, { x: 50, y: y - 40, size: 9, font: helvetica, color: black });
      page.drawText(`عمرها: ${data.mere_age || '.....'} سنة`, { x: 50, y: y - 58, size: 9, font: helvetica, color: black });
      page.drawText(`مهنتها: ${data.mere_metier || '.....................'}`, { x: 200, y: y - 58, size: 9, font: helvetica, color: black });
      
      y = y - 90;
      page.drawText(`الساكنين: ${data.adresse || '..................................................'}`, { x: 50, y: y, size: 9, font: helvetica, color: black });
      page.drawText(`بلدية: ${data.domicile_commune || '.............'}`, { x: 50, y: y - 18, size: 9, font: helvetica, color: black });
      page.drawText(`ولاية: ${data.domicile_wilaya || '.............'}`, { x: 250, y: y - 18, size: 9, font: helvetica, color: black });
      
      y = y - 50;
      page.drawLine({ start: { x: 50, y: y }, end: { x: width - 50, y: y }, thickness: 0.5, color: lightGray });
      page.drawText(`حرر في: ${data.date_acte || '...../...../.....'}`, { x: 50, y: y - 18, size: 9, font: helvetica, color: black });
      page.drawText(`بإعلان أدلى به السيد(ة): ${data.declarant || '.................................'}`, { x: 50, y: y - 36, size: 9, font: helvetica, color: black });
      
      y = y - 130;
      const today = new Date();
      const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
      drawCenterText(`حررت ب. ${data.wilaya_delivrance || 'Mostaganem'} .... في ${data.date_delivrance || dateStr}`, y, 9, helvetica, black);
      
      y = y - 50;
      drawCenterText('مستخرج من السجل الوطني للحالة المدنية - المرجع ج م 7', y, 9, helveticaBold, darkBlue);
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Error generating Acte de Naissance:', error);
      throw error;
    }
  }

  // ========== EXISTING — Carte de Séjour ==========
  static generateCarteSejour(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument({ size: 'A4' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        doc.rect(0, 0, 595, 90).fill('#1e3a5f');
        doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('الجمهورية الجزائرية الديموقراطية الشعبية', 50, 18, { align: 'center', width: 495 });
        doc.end();
      } catch (err) { reject(err); }
    });
  }
}

export default PDFService;