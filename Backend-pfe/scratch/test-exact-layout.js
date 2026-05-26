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
const v = (val, fallback = '....................') => (val ? String(val) : fallback);
const formatDate = (d) => {
   if (!d) return '';
   const dt = new Date(d);
   return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
};

const d = {
   numeroChahada: '12345/2026',
   dateNaissance: '26/05/2000',
   heureNaissance: '10:30',
   communeNaissance: 'مستغانم',
   wilayaNaissance: 'مستغانم',
   fullName: 'محمد بن علي',
   genre: 'ذكر',
   pereNomPrenom: 'علي بن أحمد',
   pereAge: '35',
   pereMetier: 'مهندس',
   mereNomPrenom: 'فاطمة الزهراء',
   mereAge: '30',
   mereMetier: 'طبيبة',
   domicile: 'حي السلام رقم 12',
   domicileCommune: 'مستغانم',
   domicileWilaya: 'مستغانم',
   dateRedaction: '26/05/2026',
   heureRedaction: '14:00',
   declarePar: 'الأب',
   officierEtatCivil: 'بلخير أحمد',
   mentions_marginales: 'تزوج من فلانة بنت فلان بتاريخ 2026/05/26',
   nomLatin: 'MOHAMED BEN ALI'
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
const black = '#000000';
const gray = '#666666';

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
y += 40;

// ── TWO COLUMN LAYOUT ────────────────────────────────────────────
// Right column coordinates (narrow sidebar for register info)
const rightColX = 470;
const rightColW = W - marginX - rightColX; // 595.28 - 40 - 470 = 85.28

// Left column coordinates (main content)
const leftColX = marginX;
const leftColW = rightColX - leftColX - 10; // 470 - 40 - 10 = 420

const startY = y;
const lineH = 20;

// Draw right column fields
doc.fontSize(10).font('ArabicFont').fillColor(black);
doc.text(ar('رقم الشهادة'), rightColX, startY, { align: 'center', width: rightColW });
doc.text(v(d.numeroChahada, '.........'), rightColX, startY + lineH, { align: 'center', width: rightColW });
doc.text(v(d.dateNaissance, '..../../..'), rightColX, startY + lineH * 2, { align: 'center', width: rightColW });

// Draw left column fields
doc.text(ar(`في يوم : ${v(d.dateNaissance, '.......................................')}`), leftColX, startY, { align: 'right', width: leftColW });
doc.text(ar(`ولد(ت) بـ : ${v(d.communeNaissance, '....................')} على الساعة : ${v(d.heureNaissance, '....................')}`), leftColX, startY + lineH, { align: 'right', width: leftColW });
doc.text(ar(`بلدية : ${v(d.communeNaissance, '....................')} ولاية : ${v(d.wilayaNaissance, '....................')}`), leftColX, startY + lineH * 2, { align: 'right', width: leftColW });

y = startY + lineH * 3;

doc.text(ar(`المسمى(ة) : ${v(d.fullName, '............................................................')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`الجنس : ${v(d.genre, '............................................................')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`ابن(ة) : ${v(d.pereNomPrenom, '....................')} عمره : ${v(d.pereAge, '..........')} مهنة : ${v(d.pereMetier, '....................')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`و : ${v(d.mereNomPrenom, '....................')} عمرها : ${v(d.mereAge, '..........')} مهنتها : ${v(d.mereMetier, '....................')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`الساكنين بـ : ${v(d.domicile, '....................')} بلدية : ${v(d.domicileCommune, '..........')} ولاية : ${v(d.domicileWilaya, '..........')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`حرر في : ${v(d.dateRedaction, '....................')} على الساعة : ${v(d.heureRedaction, '..........')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`بإعلان ادلى به السيد(ة) : ${v(d.declarePar, '............................................................')}`), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar('........................................................................................................................................'), marginX, y, { align: 'right', width: contentW });
y += lineH;

doc.text(ar(`وبعد التلاوة وقع معنا نحن : ${v(d.officierEtatCivil, '........................................')} ضابط الحالة المدنية بالبلدية`), marginX, y, { align: 'right', width: contentW });
y += lineH + 10;

// Mentions marginales
doc.font('ArabicFont').text(ar('البيانات الهامشية'), marginX, y, { align: 'right', width: contentW });
y += lineH;
if (d.mentions_marginales) {
   doc.text(ar(d.mentions_marginales), marginX, y, { align: 'right', width: contentW });
   y += lineH;
}
for (let i = 0; i < 3; i++) {
   doc.text('........................................................................................................................................', marginX, y, { align: 'right', width: contentW });
   y += 16;
}

// ── DATE / SIGNATURE ─────────────────────────────────────────────
y += 10;
doc.font('ArabicFont').text(ar('حررت بـ .. مستغانم ......في.. '), marginX, y, { align: 'left', width: contentW, continued: true })
   .font('Helvetica').text(formatDate(new Date()));

// ── FOOTER ───────────────────────────────────────────────────────
doc.page.margins.bottom = 0;
const footerY = H - 95;

const label1 = ar('١-بكامل الحروف : ');
const label2 = ar('٢-اسم ولقب الولد : ');
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

const chunks = [];
doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
   fs.writeFileSync('scratch/test-exact-layout.pdf', Buffer.concat(chunks));
   const text = fs.readFileSync('scratch/test-exact-layout.pdf', 'utf-8');
   const pages = text.match(/\/Type\s*\/Page\b/g);
   console.log('Exact Layout Page Count:', pages ? pages.length : 'unknown');
});
doc.end();
