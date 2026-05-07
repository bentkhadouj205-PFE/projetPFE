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

  // ========== BIRTH CERTIFICATE MATCHING YOUR DATABASE SCHEMA ==========
  
  static async generateActeNaissance(data) {
    return new Promise((resolve, reject) => {
      try {
        const arabicFontPath = path.join(__dirname, '../../fonts/NotoSansArabic-Regular.ttf');
        const hasArabicFont = fs.existsSync(arabicFontPath);

        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        if (hasArabicFont) {
          doc.registerFont('ArabicFont', arabicFontPath);
        }
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        const darkBlue = '#1e3a5f';
        const black = '#1f2937';
        const gray = '#6b7280';
        
        const formatDate = (date) => {
          if (!date) return '...../...../.....';
          const d = new Date(date);
          return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        };
        
        const formatTime = (time) => {
          if (!time) return '.....';
          return time;
        };
        
        let y = doc.y;
        
        // ========== HEADER ==========
        doc.rect(0, 0, 612, 85).fill(darkBlue);
        
        if (hasArabicFont) {
          doc.font('ArabicFont');
        } else {
          doc.font('Helvetica-Bold');
        }

        doc.fillColor('#ffffff')
           .fontSize(13)
           .text('الجمهورية الجزائرية الديموقراطية الشعبية', 306, 20, { align: 'center', width: 500 });
        
        doc.fontSize(9);
        if (!hasArabicFont) doc.font('Helvetica');
        doc.text('وزارة الداخلية والجماعات المحلية', 306, 40, { align: 'center', width: 500 });
        
        doc.fontSize(8);
        if (!hasArabicFont) doc.font('Helvetica-Bold');
        doc.text(`ولاية: ${data.wilaya_naissance || '.............'}`, 40, 58, { align: 'right', width: 500 })
           .text(`دائرة: ${data.daira || '.............'}`, 40, 70, { align: 'right', width: 500 })
           .text(`بلدية: ${data.commune_naissance || '.............'}`, 40, 82, { align: 'right', width: 500 });
        
        doc.fontSize(20);
        if (!hasArabicFont) doc.font('Helvetica-Bold');
        doc.text('شهادة الميلاد', 306, 105, { align: 'center', width: 500 });
        
        doc.fontSize(10);
        if (!hasArabicFont) doc.font('Helvetica');
        doc.text('نسخة الكترونية', 306, 130, { align: 'center', width: 500 });
        
        // ========== CERTIFICATE NUMBER ==========
        y = 165;
        doc.fillColor(black)
           .fontSize(10)
           .font('Helvetica')
           .text(`رقم الشهادة: ${data.numero_chahada || data.numero_acte || '...../...../.....'}`, 50, y);
        
        // ========== BIRTH DETAILS ==========
        y += 25;
        if (!hasArabicFont) doc.font('Helvetica');
        doc.text(`في يوم: ${formatDate(data.date_naissance)}`, 50, y, { align: 'right', width: 500 });
        doc.text(`على الساعة: ${formatTime(data.heure_naissance)}`, 50, y, { align: 'right', width: 250 });
        
        y += 20;
        doc.text(`ولد(ت) ب: ${data.lieu_naissance || '.............'}`, 50, y, { align: 'right', width: 500 });
        
        y += 20;
        doc.text(`بلدية: ${data.commune_naissance || '.............'}`, 50, y, { align: 'right', width: 500 });
        doc.text(`ولاية: ${data.wilaya_naissance || '.............'}`, 50, y, { align: 'right', width: 250 });
        
        // ========== CHILD NAME ==========
        y += 30;
        if (hasArabicFont) doc.font('ArabicFont'); else doc.font('Helvetica-Bold');
        doc.fontSize(11)
           .text(`المسمى(ة): ${data.nom_prenom || '..........................'}`, 50, y, { align: 'right', width: 500 });
        
        y += 20;
        doc.font('Helvetica')
           .fontSize(10)
           .text(`الجنس: ${data.sexe === 'M' ? 'ذكر' : data.sexe === 'F' ? 'أنثى' : '.....'}`, 50, y);
        
        // ========== FATHER ==========
        y += 30;
        if (hasArabicFont) doc.font('ArabicFont'); else doc.font('Helvetica-Bold');
        doc.text(`ابن(ة): ${data.pere_nom_prenom || '........................'}`, 50, y, { align: 'right', width: 500 });
        
        y += 20;
        if (!hasArabicFont) doc.font('Helvetica');
        doc.text(`عمره: ${data.pere_age || '.....'} سنة`, 50, y, { align: 'right', width: 500 })
           .text(`مهنة: ${data.pere_metier || '.....................'}`, 50, y, { align: 'right', width: 350 });
        
        y += 18;
        doc.text(` domicilié à: ${data.pere_domicile_commune || '.............'}`, 50, y, { align: 'right', width: 500 })
           .text(`ولاية: ${data.pere_domicile_wilaya || '.............'}`, 50, y, { align: 'right', width: 300 });
        
        // ========== MOTHER ==========
        y += 28;
        if (hasArabicFont) doc.font('ArabicFont'); else doc.font('Helvetica-Bold');
        doc.text(`و: ${data.mere_nom_prenom || '........................'}`, 50, y, { align: 'right', width: 500 });
        
        y += 20;
        if (!hasArabicFont) doc.font('Helvetica');
        doc.text(`عمرها: ${data.mere_age || '.....'} سنة`, 50, y, { align: 'right', width: 500 })
           .text(`مهنتها: ${data.mere_metier || '.....................'}`, 50, y, { align: 'right', width: 350 });
        
        y += 18;
        doc.text(` domiciliée à: ${data.mere_domicile_commune || '.............'}`, 50, y, { align: 'right', width: 500 })
           .text(`ولاية: ${data.mere_domicile_wilaya || '.............'}`, 50, y, { align: 'right', width: 300 });
        
        // ========== FAMILY ADDRESS ==========
        y += 28;
        doc.font('Helvetica-Bold')
           .text(`الساكنين:`, 50, y);
        
        y += 20;
        doc.font('Helvetica')
           .text(`بلدية: ${data.domicile_commune || '.............'}`, 50, y)
           .text(`ولاية: ${data.domicile_wilaya || '.............'}`, 250, y);
        
        // ========== ISSUANCE DETAILS ==========
        y += 35;
        doc.text(`حرر في: ${formatDate(data.date_acte)}`, 50, y);
        doc.text(`على الساعة: ${formatTime(data.heure_redaction)}`, 250, y);
        
        y += 20;
        doc.text(`بإعلان أدلى به السيد(ة): ${data.declare_par || '........................'}`, 50, y);
        
        // ========== OFFICER SIGNATURE ==========
        y += 50;
        doc.text(`وبعد التلاوة وقع معنا نحن:`, 50, y);
        
        y += 20;
        doc.text(`..................................................`, 50, y);
        
        y += 20;
        doc.font('Helvetica-Bold')
           .text(`${data.officier_etat_civil || 'ضابط الحالة المدنية'}`, 50, y);
        doc.font('Helvetica')
           .text(`ببلدية: ${data.officier_commune || data.commune_naissance || '.............'}`, 200, y);
        
        // ========== MARGINAL NOTES ==========
        y += 45;
        doc.font('Helvetica-Bold')
           .text(`البيانات الهامشية:`, 50, y);
        
        y += 20;
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(gray);
        
        if (data.marginal_notes) {
          const lines = data.marginal_notes.split('\n');
          for (const line of lines) {
            doc.text(line, 50, y, { width: 500 });
            y += 15;
          }
        } else {
          for (let i = 0; i < 4; i++) {
            doc.text('.........................................................................', 50, y + (i * 15));
          }
          y += 60;
        }
        
        // ========== FOOTER ==========
        doc.fillColor(black);
        const today = new Date();
        const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
        
        y += 30;
        doc.font('Helvetica')
           .fontSize(10)
           .text(`حررت ب. ${data.wilaya_delivrance || 'مستغانم'} في ${formatDate(data.date_delivrance) || dateStr}`, 306, y, { align: 'center', width: 500 });
        
        // ========== LATIN TRANSCRIPTION ==========
        y += 30;
        doc.fontSize(9)
           .fillColor(gray)
           .text(`الكتابة السابقة للاسم واللقب بالحروف اللاتينية:`, 50, y);
        
        y += 18;
        doc.fillColor(black)
           .fontSize(9)
           .text(`1- بكامل الحروف: ${(data.nom_prenom || '').toUpperCase()}`, 50, y);
        
        y += 18;
        doc.text(`2- اسم ولقب الولادة: ${(data.pere_nom_prenom || '').toUpperCase()}`, 50, y);
        
        // ========== FINAL REFERENCE ==========
        y += 35;
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(darkBlue)
           .text(`مستخرج من السجل الوطني للحالة المدنية - المرجع ج م 7`, 306, y, { align: 'center', width: 500 });
        
        doc.end();
      } catch (error) {
        console.error('Error generating Acte de Naissance:', error);
        reject(error);
      }
    });
  }

  static generateCarteSejour(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        const W = 595;
        doc.rect(0, 0, W, 90).fill('#1e3a5f');
        doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('الجمهورية الجزائرية الديموقراطية الشعبية', 50, 18, { align: 'center', width: W - 100 });
        doc.fillColor('#1f2937').fontSize(22).font('Helvetica-Bold').text('CARTE DE RÉSIDENCE', 50, 105, { align: 'center', width: W - 100 });
        doc.end();
      } catch (err) { reject(err); }
    });
  }
}

export default PDFService;