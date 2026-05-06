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
body {
    font-family: Arial, sans-serif;
    direction: rtl;
    margin: 30px;
    background-color: #fff;
}
.container {
    width: 850px;
    margin: auto;
    border: 1px solid #ccc;
    padding: 40px;
}
.center {
    text-align: center;
    line-height: 1.8;
}
.line {
    display: flex;
    align-items: center;
    margin: 8px 0;
}
.label {
    white-space: nowrap;
    font-size: 15px;
    font-weight: bold;
}
.dots {
    flex: 1;
    border-bottom: 1px dotted black;
    margin: 0 8px;
    height: 14px;
}
.value {
    color: #1a1a1a;
    font-weight: normal;
}
.section {
    margin-top: 25px;
}
.small {
    font-size: 13px;
}
</style>
</head>
<body>
<div class="container">
    <div class="center">
        <strong>الجمهورية الجزائرية الديمقراطية الشعبية</strong><br />
        وزارة الداخلية والجماعات المحلية<br />
        السجل الوطني للحالة المدنية<br /><br />
        <strong>شهادة الميلاد</strong><br />
        نسخة الكترونية
    </div>
     <div class="right">
        وزارة الداخلية والجماعات المحلية<br />
        السجل الوطني للحالة المدنية<br /><br />
        
    </div>
    <div class="left"><strong>شهادة الميلاد</strong><br />
        نسخة الكترونية
        
    </div>

    <div class="section">
        <div class="left">
            <span class="label">رقم الشهادة:</span>
            <span class="value">${v(data.numeroChahada)}</span>
            <span class="value">${formatDate(data.dateNaissance)}</span>
          
        </div>
        <div class="line">          
            <span class="label">في يوم:</span>
          <span class="dots"></span>
          <span class="label">على الساعة:</span>
            <span class="value">${formatTime(data.heureNaissance)}</span>
            <span class="dots"></span>  
            <span class="label">(ولد)ت بـ:</span>
            <span class="value">${v(data.communeNaissance)}</span>
            <span class="dots"></span>
          
            
        </div>
        <div class="line">
        <span class="label">بلدية:</span>
            <span class="value">${v(data.communeNaissance)}</span>
            <span class="dots"></span>
            <span class="label">ولاية:</span>
            <span class="value">${v(data.wilayaNaissance)}</span>
            <span class="dots"></span>
            
        </div>
        <div class="line">
            <span class="label">المسمى(ة):</span>
            <span class="value"><strong>${v(data.fullName)}</strong></span>
            <span class="dots"></span>
        </div>
        <div class="line">
         <span class="label">الجنس </span>
            <span class="value">${v(data.communeNaissance)}</span>
            <span class="dots"></span>
            <span class="label">ابن(ة):</span>
            <span class="value">${v(data.pereNomPrenom)}</span>
            <span class="dots"></span>
            <span class="label">عمره:</span>
            <span class="value">${v(data.pereAge)}</span>
            <span class="dots"></span>
            <span class="label">مهنته:</span>
            <span class="value">${v(data.pereMetier)}</span>
        </div>
        <div class="line">
            <span class="label">و:</span>
            <span class="value">${v(data.mereNomPrenom)}</span>
            <span class="dots"></span>
            <span class="label">عمرها:</span>
            <span class="value">${v(data.mereAge)}</span>
            <span class="dots"></span>
            <span class="label">مهنتها:</span>
            <span class="value">${v(data.mereMetier)}</span>
        </div>
        <div class="line">
            <span class="label">الساكنين بـ:</span>
            <span class="value">${v(data.domicileCommune)}</span>
            <span class="dots"></span>
            <span class="label">بلدية:</span>
            <span class="dots"></span>
            <span class="label">ولاية:</span>
            <span class="value">${v(data.domicileWilaya)}</span>
        </div>
        <div class="line">
            <span class="label">حرر في:</span>
            <span class="dots"></span>
            <span class="label">على الساعة:</span>
            <span class="value">${formatTime(data.heureRedaction)}</span>
            <span class="dots"></span>
        </div>
        <div class="line">
            <span class="label">إعلان ادى به الس يد )ة</span>
            <span class="value">${v(data.declarePar)}</span>
            <span class="dots"></span>
            <span class="dots"></span>
        </div>
        <div class="line">
            <span class="label">وبعد التلاوة وقع معنا نحن:</span>
            <span class="value">${v(data.officierEtatCivil)}</span>
            <span class="dots"></span>
            <span class="label">ضابط الحالة المدنية</span>
        </div>
    </div>

    <div class="section">
        <div class="line">
            <span class="label">البيانات الهامشية:</span>
            <span class="value">${v(data.marginalNotes)}</span>
            <span class="dots"></span>
        </div>
        <div class="line"><span class="dots"></span></div>
        <div class="line"><span class="dots"></span></div>
    </div>

    <div class="section small">
        <div class="left">
            <span class="label">حررت بمستغانم في:</span>
            <span class="value">${today}</span>
            <span class="dots"></span>
        </div>
        <div class="right">
            <span class="label">الكتابة بالحروف اللاتينية:</span>
            <span class="value">${v(data.fullNameLatin || data.fullName)}</span>
            <span class="dots"></span>
        </div>
        <div class="right">
            مستخرج من السجل الوطني للحالة المدنية<br />
            المرجع ج م 7
        </div>
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
      subject: `وثيقتك جاهزة - ${requestSubject || 'شهادة الميلاد'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right">
          <div style="background:#00782B;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">بلديتي الرقمية</h1>
            <p style="color:#c8f5d8;margin:4px 0 0">خدمة الحالة المدنية الإلكترونية</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">مرحباً <strong>${citizenFirstName || ''}</strong>،</p>
            <p>تمت <span style="color:#00782B;font-weight:bold">الموافقة</span> على طلبك الخاص بـ <strong>${requestSubject || 'شهادة الميلاد'}</strong>.</p>
            <p>وثيقتك الرسمية مرفقة بهذا البريد الإلكتروني على شكل ملف PDF يمكنك تنزيله.</p>
            ${comment ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px;font-style:italic">ملاحظة: ${comment}</p>` : ''}
            <p style="color:#888;font-size:13px;margin-top:20px">تمت المعالجة بواسطة: <strong>${employeeName || 'مصلحة الحالة المدنية'}</strong></p>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
            بلديتي الرقمية - وثيقة مولّدة تلقائياً
          </div>
        </div>
      `,
      attachment: [{
        content: pdfBuffer.toString('base64'),
        name: 'شهادة_الميلاد.pdf',
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
      console.error('❌ Brevo API Error:', result);
      throw new Error(result.message || 'Failed to send email via Brevo');
    }
    return { messageId: result.messageId };
  },
};
