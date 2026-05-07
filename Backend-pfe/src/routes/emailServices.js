import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function initializeEmail() {
  console.log('✅ Brevo API Service ready');
  return true;
}

export async function generateCertificatePDF(data) {
  const now = new Date();
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const formatDate = (d) => {
    if (!d) return '../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const formatTime = (t) => (t ? String(t).substring(0, 5) : '......');
  const v = (val, fallback = '..........') => (val ? String(val) : fallback);
  const html = `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>شهادة الميلاد</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    direction: rtl;
    background: #fff;
    color: #000;
  }
  .container { width: 850px; margin: auto; padding: 40px 50px; }

  .header-top { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
  .header-right { text-align: right; font-size: 14px; line-height: 1.9; margin-bottom: 20px; }
  .title-block { text-align: center; margin: 20px 0 4px; }
  .title-block h1 { font-size: 30px; font-weight: bold; }
  .title-block .subtitle { font-size: 15px; margin-top: 4px; }

  .rows { margin-top: 28px; }
  .row {
    display: flex;
    align-items: flex-end;
    width: 100%;
    margin-bottom: 10px;
    font-size: 14.5px;
  }
  .lbl { white-space: nowrap; padding-left: 4px; padding-right: 2px; }
  .dots {
    flex: 1;
    border-bottom: 1px dotted #000;
    min-width: 30px;
    margin: 0 4px 3px;
  }
  .val { white-space: nowrap; padding-left: 4px; padding-right: 2px; }

  .row-split { display: flex; width: 100%; margin-bottom: 10px; font-size: 14.5px; align-items: flex-end; }
  .row-split .right-part { display: flex; flex: 1; align-items: flex-end; }
  .row-split .left-label { white-space: nowrap; padding-right: 10px; font-size: 13px; }

  .footer-section { margin-top: 30px; font-size: 14px; }
  .footer-bottom { margin-top: 20px; font-size: 13.5px; }
  .footer-bottom .latin-line { text-align: right; margin-bottom: 6px; }
  .footer-bottom .notes { text-align: right; font-size: 13px; line-height: 1.9; margin-top: 6px; }
  .footer-bottom .bold-center { text-align: center; font-weight: bold; font-size: 14px; margin-top: 6px; }
  .footer-bottom .ref { text-align: center; font-size: 13px; }
  .extra-dots { border-bottom: 1px dotted #000; width: 100%; margin: 8px 0; }
</style>
</head>
<body>
<div class="container">

  <div class="header-top">الجمهورية الجزائرية الديموقراطية الشعبية</div>
  <div class="header-right">
    وزارة الداخلية والجماعات المحلية<br />
    السجل الوطني للحالة المدنية
  </div>

  <div class="title-block">
    <h1>شهادة الميلاد</h1>
    <div class="subtitle">نسخة الكترونية</div>
  </div>

  <div class="rows">

    <!-- ROW 1: رقم الشهادة + في يوم -->
    <div class="row-split">
      <div class="right-part">
        <span class="lbl">في يوم</span>
        <span class="dots"></span>
        <span class="val">\${formatDate(data.dateNaissance)}</span>
      </div>
      <span class="left-label">رقم الشهادة &nbsp; \${v(data.numeroChahada)}</span>
    </div>

    <!-- ROW 2: ......... على الساعة ... ولد(ت)ب -->
    <div class="row">
      <span class="dots"></span>
      <span class="lbl">على الساعة</span>
      <span class="dots"></span>
      <span class="val">\${formatTime(data.heureNaissance)}</span>
      <span class="dots"></span>
      <span class="lbl">ولد(ت)ب.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.communeNaissance)}</span>
    </div>

    <!-- ROW 3: بلدية ... ولاية -->
    <div class="row">
      <span class="lbl">بلدية</span>
      <span class="dots"></span>
      <span class="val">\${v(data.communeNaissance)}</span>
      <span class="dots"></span>
      <span class="lbl">ولاية.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.wilayaNaissance)}</span>
    </div>

    <!-- ROW 4: المسمى(ة) + date on left -->
    <div class="row-split">
      <div class="right-part">
        <span class="lbl">المسمى(ة)</span>
        <span class="dots"></span>
        <span class="val"><strong>\${v(data.fullName)}</strong></span>
        <span class="dots"></span>
      </div>
      <span class="left-label">..../.../...</span>
    </div>

    <!-- ROW 5: الجنس -->
    <div class="row">
      <span class="lbl">الجنس</span>
      <span class="dots"></span>
      <span class="val">\${v(data.genre)}</span>
      <span class="dots"></span>
    </div>

    <!-- ROW 6: ابن(ة) ... عمره ... مهنة -->
    <div class="row">
      <span class="lbl">ابن(ة)</span>
      <span class="dots"></span>
      <span class="val">\${v(data.pereNomPrenom)}</span>
      <span class="dots"></span>
      <span class="lbl">عمره.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.pereAge)}</span>
      <span class="lbl">مهنة.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.pereMetier)}</span>
      <span class="dots"></span>
    </div>

    <!-- ROW 7: و ... عمرها ... مهنتها -->
    <div class="row">
      <span class="lbl">و</span>
      <span class="dots"></span>
      <span class="val">\${v(data.mereNomPrenom)}</span>
      <span class="dots"></span>
      <span class="lbl">عمرها......</span>
      <span class="dots"></span>
      <span class="val">\${v(data.mereAge)}</span>
      <span class="lbl">مهنتها.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.mereMetier)}</span>
      <span class="dots"></span>
    </div>

    <!-- ROW 8: الساكنين ... بلدية ... ولاية -->
    <div class="row">
      <span class="lbl">الساكنين.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.domicileCommune)}</span>
      <span class="dots"></span>
      <span class="lbl">بلدية.</span>
      <span class="dots"></span>
      <span class="lbl">ولاية.</span>
      <span class="dots"></span>
      <span class="val">\${v(data.domicileWilaya)}</span>
    </div>

    <!-- ROW 9: حرر في ... على الساعة -->
    <div class="row">
      <span class="lbl">حرر في</span>
      <span class="dots"></span>
      <span class="lbl">على الساعة...</span>
      <span class="dots"></span>
      <span class="val">\${formatTime(data.heureRedaction)}</span>
      <span class="dots"></span>
    </div>

    <!-- ROW 10: بإعلان أدلى به السيد(ة) -->
    <div class="row">
      <span class="lbl">بإعلان أدلى به السيد(ة)</span>
      <span class="dots"></span>
      <span class="val">\${v(data.declarePar)}</span>
      <span class="dots"></span>
    </div>

    <!-- ROW 11: empty dots line -->
    <div class="row"><span class="dots"></span></div>

    <!-- ROW 12: وبعد التلاوة وقع معنا نحن ... ضابط الحالة المدنية ببلدية -->
    <div class="row">
      <span class="lbl">وبعد التلاوة وقع معنا نحن</span>
      <span class="dots"></span>
      <span class="val">\${v(data.officierEtatCivil)}</span>
      <span class="dots"></span>
      <span class="lbl">ضابط الحالة المدنية ببلدية</span>
    </div>

    <!-- ROW 13: البيانات الهامشية -->
    <div class="row">
      <span class="lbl">البيانات الهامشية</span>
      <span class="dots"></span>
      <span class="val">\${v(data.marginalNotes)}</span>
      <span class="dots"></span>
    </div>

    <!-- 4 blank dotted lines -->
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>

  </div>

  <!-- FOOTER -->
  <div class="footer-section">
    <div class="row">
      <span class="lbl">حررت ب. مستغانم ......</span>
      <span class="lbl">في...</span>
      <span class="val">\${today}</span>
      <span class="lbl">.../.../...</span>
    </div>
  </div>

  <div class="footer-bottom">
    <div class="latin-line">الكتابة السابقة للاسم واللقب ب أحرف اللاتينية</div>
    <div class="extra-dots" style="width:55%;margin-right:auto;margin-left:0;"></div>
    <div class="notes">
      1- بكامل الحروف<br />
      2- اسم ولقب الولد
    </div>
    <div class="bold-center">مستخرج من السجل الوطني للحالة المدنية</div>
    <div class="ref">المرجع ج م 7</div>
  </div>

</div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBuffer) {
    const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS;

    const payload = {
      sender: { name: 'Baladiya Digital', email: 'baladiyadigital27@gmail.com' },
      to: [{ email: citizenEmail, name: citizenFirstName }],
      subject: `Votre document est prêt - ${requestSubject || 'Acte de Naissance'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right">
          <div style="background:#00782B;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
            <p style="color:#c8f5d8;margin:4px 0 0">Service d'état civil en ligne</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>،</p>
            <p>Votre demande a été acceptée par nos services <span style="color:#00782B;font-weight:bold">${requestSubject || 'Acte de Naissance'}</span>.</p>
            <p>Votre document officiel est joint en format PDF.</p>
            ${comment ? `<p style="background:#f0faf4;padding:12px;border-radius:6px;font-style:italic;border-left:4px solid #00782B;color:#00782B">Remarque : ${comment}</p>` : ''}
            <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || 'service d\'état civil'}</strong></p>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
            Baladiya Digital — Document généré automatiquement
          </div>
        </div>
      `,
      attachment: [{
        content: pdfBuffer.toString('base64'),
        name: 'Acte_de_Naissance.pdf',
      }],
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(' Brevo API Error:', result);
      throw new Error(result.message || 'Failed to send email via Brevo');
    }
    return { messageId: result.messageId };
  },
};
