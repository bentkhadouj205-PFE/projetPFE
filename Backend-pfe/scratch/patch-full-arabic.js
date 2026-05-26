import fs from 'fs';

const filePath = 'src/server/pdfservice.js';
let content = fs.readFileSync(filePath, 'utf-8');

const startIndex = content.indexOf('static generateActeNaissanceArabic(data) {');
const endIndex = content.indexOf('static generateCitizenPDF(requestRow) {');

if (startIndex === -1 || endIndex === -1) {
   console.error('Could not find start or end index!');
   process.exit(1);
}

const prefix = content.substring(0, startIndex);
const suffix = content.substring(endIndex);

const newMethod = `static generateActeNaissanceArabic(data) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({
               size: 'A4',
               margins: { top: 30, bottom: 30, left: 40, right: 40 },
               bufferPages: true,
            });

            const fontPath = path.join(__dirname, '../../fonts/NotoSansArabic-Regular.ttf');
            doc.registerFont('ArabicFont', fontPath);

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const black = '#000000';
            const gray = '#666666';
            const W = 595.28;
            const H = 841.89;
            const marginX = 40;
            const contentW = W - marginX * 2;
            const lineH = 19;
            const lineGap = 4;

            // Normalise DB row
            const d = {
               numeroChahada: data.numero_acte || data.numero_chahada || data.numeroChahada,
               dateNaissance: data.date_naissance || data.date_naissance_enfant || data.dateNaissance,
               heureNaissance: data.heure_naissance || data.heureNaissance,
               communeNaissance: data.commune_naissance || data.communeNaissance,
               wilayaNaissance: data.wilaya_naissance || data.wilayaNaissance,
               fullName: data.nom_prenom_enfant || data.nom_prenom || data.fullName,
               genre: data.genre_enfant || data.sexe || data.genre,
               pereNomPrenom: data.nom_prenom_pere || data.pere_nom_prenom || data.pereNomPrenom,
               pereAge: clean(data.age_pere || data.pere_age || data.pereAge),
               pereMetier: clean(data.metier_pere || data.pere_metier || data.pereMetier),
               mereNomPrenom: data.nom_prenom_mere || data.mere_nom_prenom || data.mereNomPrenom,
               mereAge: clean(data.age_mere || data.mere_age || data.mereAge),
               mereMetier: clean(data.metier_mere || data.mere_metier || data.mereMetier),
               domicile: clean(data.domicile),
               domicileCommune: clean(data.domicile_commune || data.domicileCommune),
               domicileWilaya: clean(data.domicile_wilaya || data.domicileWilaya),
               dateRedaction: data.date_redaction || data.date_acte || data.created_at || data.dateRedaction,
               heureRedaction: data.heure_redaction || data.heureRedaction,
               declarePar: data.declare_par || data.notes || data.declarePar,
               officierEtatCivil: data.officier_etat_civil || data.officierEtatCivil,
               mentions_marginales: data.mentions_marginales || data.notes || data.mentions_marginales,
               nomLatin: data.citizens 
                  ? \`\${data.citizens.nom || ''} \text\${data.citizens.prenom || ''}\`.trim().toUpperCase()
                  : (data.nom && data.prenom ? \`\${data.nom} \${data.prenom}\`.trim().toUpperCase() : ''),
            };

            // Fix nested name if query was different
            if (!d.nomLatin && data.citizens && typeof data.citizens === 'object') {
               d.nomLatin = \`\${data.citizens.nom || ''} \${data.citizens.prenom || ''}\`.trim().toUpperCase();
            }

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
            y += 35;

            // ── TWO COLUMN LAYOUT ────────────────────────────────────────────
            const rightColX = 470;
            const rightColW = W - marginX - rightColX;
            const leftColX = marginX;
            const leftColW = rightColX - leftColX - 10;

            const startY = y;

            // Draw right column fields
            doc.fontSize(10).font('ArabicFont').fillColor(black);
            doc.text(ar('رقم الشهادة'), rightColX, startY, { align: 'center', width: rightColW });
            doc.text(v(d.numeroChahada, '.........'), rightColX, startY + lineH, { align: 'center', width: rightColW });
            doc.text(formatDate(d.dateNaissance) || '..../../..', rightColX, startY + lineH * 2, { align: 'center', width: rightColW });

            // Draw left column fields
            doc.text(ar(\`في يوم : \${formatDate(d.dateNaissance) || '.......................................'}\`), leftColX, startY, { align: 'right', width: leftColW });
            doc.text(ar(\`ولد(ت) بـ : \${v(d.communeNaissance, '....................')} على الساعة : \${v(d.heureNaissance, '....................')}\`), leftColX, startY + lineH, { align: 'right', width: leftColW });
            doc.text(ar(\`بلدية : \${v(d.communeNaissance, '....................')} ولاية : \${v(d.wilayaNaissance, '....................')}\`), leftColX, startY + lineH * 2, { align: 'right', width: leftColW });

            y = startY + lineH * 3;

            doc.text(ar(\`المسمى(ة) : \${v(d.fullName, '............................................................')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`الجنس : \${v(d.genre, '............................................................')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`ابن(ة) : \${v(d.pereNomPrenom, '....................')} عمره : \${v(d.pereAge, '..........')} مهنة : \${v(d.pereMetier, '....................')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`و : \${v(d.mereNomPrenom, '....................')} عمرها : \${v(d.mereAge, '..........')} مهنتها : \${v(d.mereMetier, '....................')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`الساكنين بـ : \${v(d.domicile, '....................')} بلدية : \${v(d.domicileCommune, '..........')} ولاية : \${v(d.domicileWilaya, '..........')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`حرر في : \${formatDate(d.dateRedaction) || '....................'} على الساعة : \${v(d.heureRedaction, '..........')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`بإعلان ادلى به السيد(ة) : \${v(d.declarePar, '............................................................')}\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar('........................................................................................................................................'), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap;

            doc.text(ar(\`وبعد التلاوة وقع معنا نحن : \${v(d.officierEtatCivil, '........................................')} ضابط الحالة المدنية بالبلدية\`), marginX, y, { align: 'right', width: contentW });
            y += lineH + lineGap + 5;

            // Mentions marginales
            doc.font('ArabicFont').text(ar('البيانات الهامشية'), marginX, y, { align: 'right', width: contentW });
            y += lineH;
            if (d.mentions_marginales) {
               doc.text(ar(d.mentions_marginales), marginX, y, { align: 'right', width: contentW });
               y += lineH;
            }
            for (let i = 0; i < 3; i++) {
               doc.fontSize(10).font('ArabicFont').fillColor(black)
                  .text('........................................................................................................................................', marginX, y, { align: 'right', width: contentW });
               y += 16;
            }

            // ── DATE / SIGNATURE ─────────────────────────────────────────────
            y += 10;
            doc.fontSize(10).font('ArabicFont').fillColor(black)
               .text(ar('حررت بـ .. مستغانم ......في.. '), marginX, y, { align: 'left', width: contentW, continued: true })
               .font('Helvetica').text(formatDate(new Date()));

            // ── FOOTER ───────────────────────────────────────────────────────
            // Temporarily set bottom margin to 0 for footer to prevent auto page break
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

            doc.end();
         } catch (error) {
            reject(error);
         }
      });
   }
`;

fs.writeFileSync(filePath, prefix + newMethod + suffix, 'utf-8');
console.log('Done!');
