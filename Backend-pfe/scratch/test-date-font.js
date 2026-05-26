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

// Print using continued: true to mix fonts on the same line
doc.fontSize(10);
doc.font('ArabicFont').text(ar('حررت بـ .. مستغانم ......في.. '), 40, 100, { continued: true })
   .font('Helvetica').text('26/05/2026');

const chunks = [];
doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
   fs.writeFileSync('scratch/test-date.pdf', Buffer.concat(chunks));
   console.log('PDF saved.');
});
doc.end();
