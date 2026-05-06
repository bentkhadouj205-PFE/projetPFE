import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeEmail() {
  console.log(' Brevo API Service ready');
  return true;
}

export async function generateCertificatePDF(data) {
  const now = new Date();
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const formatDate = (d) => {
    if (!d) return '..../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const formatTime = (t) => t ? t.substring(0, 5) : '......';

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  let fontArabic;
  let fontRegular;
  let fontBold;

  try {
    // تشخيص: طباعة محتويات المجلد الحالي والمجلد الرئيسي في الـ Logs
    console.log('📂 CWD:', process.cwd());
    try {
      console.log('📂 Root Files:', fs.readdirSync(process.cwd()).join(', '));
      if (fs.existsSync(path.join(process.cwd(), 'src'))) {
         console.log('📂 src Files:', fs.readdirSync(path.join(process.cwd(), 'src')).join(', '));
      }
    } catch (e) { console.log('📂 ListDir error:', e.message); }

    // تجربة عدة مسارات محتملة للخط لضمان العمل على Render
    const pathsToTry = [
      path.join(process.cwd(), 'fonts', 'NotoSansArabic-Regular.ttf'),
      path.join(process.cwd(), 'Backend-pfe', 'fonts', 'NotoSansArabic-Regular.ttf'),
      path.resolve(__dirname, '..', '..', 'fonts', 'NotoSansArabic-Regular.ttf'),
      path.join('/opt/render/project/src/fonts/NotoSansArabic-Regular.ttf'),
      path.join('/opt/render/project/src/Backend-pfe/fonts/NotoSansArabic-Regular.ttf')
    ];
    
    let fontBytes;
    let foundPath = null;
    
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        fontBytes = fs.readFileSync(p);
        foundPath = p;
        break;
      }
    }
    
    if (fontBytes) {
      fontArabic = await pdfDoc.embedFont(fontBytes);
      fontRegular = fontArabic;
      fontBold = fontArabic;
      console.log('✅ Arabic font loaded successfully from:', foundPath);
    } else {
      console.error('❌ Paths checked:', pathsToTry);
      throw new Error('Font file not found in any of the attempted paths');
    }
  } catch (error) {
    console.error('❌ CRITICAL FONT ERROR:', error.message);
    // إذا فشل تحميل الخط، لا يمكننا استخدام العربية. سنقوم بإلقاء خطأ بدلاً من الانهيار لاحقاً
    throw new Error('Arabic font support is missing. Please check server logs.');
  }

  const black = rgb(0, 0, 0);
  const grey = rgb(0.4, 0.4, 0.4);

  const sanitize = (str) => {
    if (!str) return '';
    return String(str);
  };

  const txt = (text, x, y, f = fontRegular, size = 10, color = black) => {
    const str = sanitize(text);
    if (!str) return;
    page.drawText(str, { x, y, font: f, size, color });
  };

  const dots = (x1, x2, yPos) => {
    for (let x = x1; x < x2; x += 4) {
      page.drawLine({
        start: { x: x, y: yPos },
        end: { x: x + 2, y: yPos },
        thickness: 0.5,
        color: grey
      });
    }
  };

  const ln = (x1, y1, x2, y2, t = 0.5, c = black) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color: c });

  // ========== HEADER (الرأس) ==========
  txt('الجمهورية الجزائرية الديموقراطية الشعبية', width / 2 - 130, height - 25, fontArabic, 11, black);
  txt('وزارة الداخلية والجماعات المحلية', width / 2 - 110, height - 42, fontArabic, 9, black);
  txt('السجل الوطني للحالة المدنية', width / 2 - 85, height - 57, fontArabic, 9, black);

  ln(50, height - 65, width - 50, height - 65, 0.8, black);

  // ========== TITLE (العنوان) ==========
  txt('شهادة الميلاد', width / 2 - 45, height - 88, fontArabic, 16, black);
  txt('نسخة الكترونية', width / 2 - 45, height - 105, fontArabic, 9, grey);
  ln(50, height - 112, width - 50, height - 112, 0.5, black);

  // ========== رقم الشهادة + في يوم ==========
  let y = height - 138;
  txt('رقم الشهادة:', 50, y, fontArabic, 10);
  txt(data.numeroChahada || '..........', 140, y, fontArabic, 10);
  dots(140 + (fontArabic.widthOfTextAtSize(data.numeroChahada || '..........', 10) || 50) + 5, 230, y - 2);

  txt('في يوم:', 280, y, fontArabic, 10);
  txt(formatDate(data.dateNaissance), 330, y, fontArabic, 10);
  dots(330 + (fontArabic.widthOfTextAtSize(formatDate(data.dateNaissance), 10) || 50) + 5, 450, y - 2);

  // ========== على الساعة + ولد(ت) بـ ==========
  y -= 22;
  txt('على الساعة:', 50, y, fontArabic, 10);
  txt(formatTime(data.heureNaissance) + '......', 130, y, fontArabic, 10);
  dots(200, 260, y - 2);

  txt('ولد(ت) بـ:', 280, y, fontArabic, 10);
  dots(340, width - 50, y - 2);

  // ========== بلدية + ولاية ==========
  y -= 22;
  txt('بلدية:', 50, y, fontArabic, 10);
  txt(data.communeNaissance || '..........', 100, y, fontArabic, 10);
  dots(100 + (fontArabic.widthOfTextAtSize(data.communeNaissance || '..........', 10) || 50) + 5, 230, y - 2);

  txt('ولاية:', 280, y, fontArabic, 10);
  txt(data.wilayaNaissance || '..........', 320, y, fontArabic, 10);
  dots(320 + (fontArabic.widthOfTextAtSize(data.wilayaNaissance || '..........', 10) || 50) + 5, width - 50, y - 2);

  // ========== المسمى(ة) ==========
  y -= 22;
  txt('المسمى(ة):', 50, y, fontArabic, 10);
  txt(data.fullName || '..........', 120, y, fontArabic, 11);
  dots(120 + (fontArabic.widthOfTextAtSize(data.fullName || '..........', 11) || 50) + 5, width - 50, y - 2);

  // ========== السن ==========
  y -= 22;
  txt('السن:', 50, y, fontArabic, 10);
  const sexeText = data.sexe === 'M' ? 'ذكر' : data.sexe === 'F' ? 'أنثى' : '......';
  txt(sexeText, 90, y, fontArabic, 10);
  dots(90 + (fontArabic.widthOfTextAtSize(sexeText, 10) || 50) + 5, 200, y - 2);

  // ========== ابن(ة) (الأب) ==========
  y -= 24;
  txt('ابن(ة):', 50, y, fontArabic, 10);
  txt(data.pereNomPrenom || '..........', 100, y, fontArabic, 10);
  dots(100 + (fontArabic.widthOfTextAtSize(data.pereNomPrenom || '..........', 10) || 50) + 5, 280, y - 2);

  txt('معروف بـ:', 290, y, fontArabic, 10);
  txt(data.pereMetier || '..........', 350, y, fontArabic, 10);
  dots(350 + (fontArabic.widthOfTextAtSize(data.pereMetier || '..........', 10) || 50) + 5, width - 50, y - 2);

  // ========== و (الأم) ==========
  y -= 24;
  txt('و:', 50, y, fontArabic, 10);
  txt(data.mereNomPrenom || '..........', 70, y, fontArabic, 10);
  dots(70 + (fontArabic.widthOfTextAtSize(data.mereNomPrenom || '..........', 10) || 50) + 5, 280, y - 2);

  txt('معروفة بـ:', 290, y, fontArabic, 10);
  txt(data.mereMetier || '..........', 360, y, fontArabic, 10);
  dots(360 + (fontArabic.widthOfTextAtSize(data.mereMetier || '..........', 10) || 50) + 5, width - 50, y - 2);

  // ========== الساكنين بـ ==========
  y -= 24;
  txt('الساكنين بـ:', 50, y, fontArabic, 10);
  dots(140, 250, y - 2);

  txt('بلدية:', 280, y, fontArabic, 10);
  txt(data.domicileCommune || '..........', 325, y, fontArabic, 10);
  txt('ولاية:', 410, y, fontArabic, 10);
  txt(data.domicileWilaya || '..........', 450, y, fontArabic, 10);

  // ========== حرر في ==========
  y -= 24;
  txt('حرر في:', 50, y, fontArabic, 10);
  dots(110, 270, y - 2);

  txt('على الساعة:', 280, y, fontArabic, 10);
  txt(formatTime(data.heureRedaction) + '......', 355, y, fontArabic, 10);
  dots(420, width - 50, y - 2);

  // ========== بإعلان ==========
  y -= 24;
  txt('بإعلان:', 50, y, fontArabic, 10);
  txt(data.declarePar || '..........', 110, y, fontArabic, 10);
  dots(110 + (fontArabic.widthOfTextAtSize(data.declarePar || '..........', 10) || 50) + 5, width - 50, y - 2);

  y -= 18;
  dots(50, width - 50, y - 2);

  // ========== وبعد التلاوة وقع معنا نحن ==========
  y -= 24;
  txt('وبعد التلاوة وقع معنا نحن:', 50, y, fontArabic, 9);
  txt(data.officierEtatCivil || '..........', 250, y, fontArabic, 10);
  dots(250 + (fontArabic.widthOfTextAtSize(data.officierEtatCivil || '..........', 10) || 50) + 5, width - 180, y - 2);
  txt('ضابط الحالة المدنية', width - 175, y, fontArabic, 8);
  txt('ببلدية', width - 90, y - 12, fontArabic, 8);

  // ========== البيانات الهامشية ==========
  y -= 32;
  txt('البيانات الهامشية:', 50, y, fontArabic, 9, black);

  if (data.marginalNotes) {
    txt(data.marginalNotes.substring(0, 80), 170, y, fontArabic, 8);
  }
  dots(170, width - 50, y - 2);

  y -= 16;
  dots(50, width - 50, y - 2);
  y -= 16;
  dots(50, width - 50, y - 2);
  y -= 16;
  dots(50, width - 50, y - 2);

  // ========== خط فاصل ==========
  ln(50, y - 10, width - 50, y - 10, 0.5, black);

  // ========== تاريخ الإصدار ==========
  y -= 28;
  txt(`حررت بـ ${data.redigeA || data.domicileCommune || 'مستغانم'} ...... في ${today}`, 50, y, fontArabic, 9);

  // ========== الكتابة اللاتينية ==========
  y -= 24;
  txt('الكتابة السابقة للاسم واللقب بالأحرف اللاتينية:', 80, y, fontArabic, 8, black);

  y -= 18;
  txt(data.fullNameLatin || data.fullName || '..........', 180, y, fontArabic, 11);
  dots(50, width - 50, y - 2);

  // ========== ملاحظات ==========
  y -= 24;
  txt('1- بكل الحروف', 50, y, fontArabic, 8, black);
  y -= 14;
  txt('2- اسم ولقب الولد', 50, y, fontArabic, 8, black);

  // ========== تذييل (Footer) ==========
  ln(50, 40, width - 50, 40, 0.5, black);
  txt('مستخرج من السجل الوطني للحالة المدنية - المرجع ج م 7', 120, 18, fontArabic, 8, black);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ========== خدمة الإيميل (Brevo API) ==========
export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBuffer) {
    const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS;

    const payload = {
      sender: { name: "Baladiya Digital", email: "baladiyadigital27@gmail.com" },
      to: [{ email: citizenEmail, name: citizenFirstName }],
      subject: `Votre document est prêt - ${requestSubject || 'Acte de Naissance'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
          <div style="background:#ffffff;padding:20px;text-align:center;border-bottom:2px solid #000">
            <h1 style="color:#000;margin:0;font-size:22px">Baladiya Digital</h1>
            <p style="color:#555;margin:4px 0 0">Service Etat Civil Numerique</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
            <p>Votre demande d'<strong>${requestSubject || 'Acte de Naissance'}</strong> a ete <span style="color:#000;font-weight:bold">approuvee</span>.</p>
            <p>Votre document officiel est joint a cet email en format PDF.</p>
            ${comment ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px;font-style:italic">Note : ${comment}</p>` : ''}
            <p style="color:#888;font-size:13px;margin-top:20px">Traite par : <strong>${employeeName || 'Service Etat Civil'}</strong></p>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
            Baladiya Digital - Document genere automatiquement.
          </div>
        </div>
      `,
      attachment: [
        {
          content: pdfBuffer.toString('base64'),
          name: "acte_naissance.pdf"
        }
      ]
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Brevo API Error:', result);
      throw new Error(result.message || 'Failed to send email via Brevo API');
    }

    return { messageId: result.messageId };
  }
};