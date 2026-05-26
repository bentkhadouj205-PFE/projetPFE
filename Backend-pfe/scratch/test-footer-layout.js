import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const PDFDocument = require('pdfkit');
const reshaper = require('arabic-reshaper');

const ar = (str) => {
   if (!str) return '';
   return reshaper.convertArabic(String(str)).split(' ').reverse().join(' ');
};

const doc = new PDFDocument({
   size: 'A4',
   margins: { top: 30, bottom: 30, left: 40, right: 40 },
});

const fontPath = path.join(__dirname, '../fonts/NotoSansArabic-Regular.ttf');
doc.registerFont('ArabicFont', fontPath);

const W = 595.28;
const H = 841.89;
const marginX = 40;
const contentW = W - marginX * 2;
const gray = '#666666';
const black = '#000000';

const d = {
   nomLatin: 'MOHAMED BEN ALI'
};

const footerY = H - 95;

const label1 = ar('١-بكامل الحروف :');
const label2 = ar('٢-اسم ولقب الولد :');
const labelW1 = doc.font('ArabicFont').fontSize(8).widthOfString(label1);
const labelW2 = doc.font('ArabicFont').fontSize(8).widthOfString(label2);

// Print the Arabic labels right-aligned
doc.font('ArabicFont').fontSize(8).fillColor(gray)
   .text(label1, marginX, footerY, { align: 'right', width: contentW })
   .text(label2, marginX, footerY + 12, { align: 'right', width: contentW });

// Print the Latin names next to the labels
doc.font('Helvetica').fontSize(8).fillColor(gray)
   .text(d.nomLatin || '....................', marginX, footerY, { align: 'right', width: contentW - labelW1 - 5 })
   .text(d.nomLatin || '....................', marginX, footerY + 12, { align: 'right', width: contentW - labelW2 - 5 });

const chunks = [];
doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
   fs.writeFileSync('scratch/test-layout-out.pdf', Buffer.concat(chunks));
   console.log('PDF saved.');
});
doc.end();
