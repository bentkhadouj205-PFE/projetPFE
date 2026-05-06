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

  const formatTime = (t) => t ? String(t).substring(0, 5) : '......';
  const v = (val, fallback = '..........') => val ? String(val) : fallback;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Amiri', serif;
    font-size: 12px;
    direction: rtl;
    text-align: right;
    padding: 14mm 12mm;
    width: 210mm;
    min-height: 297mm;
    color: #000;
    line-height: 1.8;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4mm;
    font-size: 11px;
  }
  .header .right { text-align: right; }
  .header .center { flex:1; text-align: center; font-weight: bold; font-size: 13px; }
  .header .left { text-align: left; font-size: 10px; }
  .title { text-align: center; margin: 5mm 0 2mm; }
  .title h1 { font-size: 24px; font-weight: bold; }
  .title p { font-size: 11px; color: #555; }
  hr { border: none; border-top: 1px solid #000; margin: 2mm 0; }
  .cert-num { display: flex; justify-content: space-between; font-size: 11px; margin: 2mm 0; }
  .row { display: flex; align-items: baseline; margin-bottom: 0.5mm; font-size: 12px; line-height: 2.2; }
  .lbl { white-space: nowrap; margin-left: 4px; }
  .fill { flex: 1; border-bottom: 1px dotted #555; margin: 0 4px; min-width: 20px; }
  .val { font-weight: bold; margin: 0 4px; }
  .issue { font-size: 12px; margin-top: 4mm; }
  .latin { text-align: center; margin-top: 5mm; border-top: 1px solid #aaa; padding-top: 3mm; font-size: 11px; }
  .latin .red { color: #cc0000; font-weight: bold; }
  .latin .line { border-bottom: 1px dotted #888; display: inline-block; width: 200px; margin-top: 3px; }
  .notes { font-size: 11px; margin-top: 3mm; line-height: 2; }
  .footer { text-align: center; border-top: 1px solid #000; margin-top: 5mm; padding-top: 3mm; font-size: 12px; font-weight: bold; }
  .footer small { font-weight: normal; color: #555; font-size: 10px; }
</style>
</head>
<body>

<div class="header">
  <div class="right">
    <div>وزارة الداخلية والجماعات المحلية</div>
    <div><strong>السجل الوطني للحالة المدنية</strong></div>
  </div>
  <div class="center">الجمهورية الجزائرية الديموقراطية الشعبية</div>
  <div class="left">بلدية</div>
</div>

<div class="title">
  <h1>شهادة الميلاد</h1>
  <p>نسخة إلكترونية</p>
</div>
<hr/>

<div class="cert-num">
  <span>رقم الشهادة: <strong>${v(data.numeroChahada)}</strong></span>
  <span>في يوم: <span style="border-bottom:1px dotted #666;display:inline-block;width:120px;">&nbsp;</span></span>
</div>

<div class="row">
  <span class="lbl">على الساعة</span><span class="fill">${formatTime(data.heureNaissance)}</span>
  <span class="lbl">ولد(ت) بـ</span><span class="fill">&nbsp;</span>
</div>

<div class="row">
  <span class="lbl">بلدية</span><span class="val">${v(data.communeNaissance)}</span><span class="fill">&nbsp;</span>
  <span class="lbl">ولاية</span><span class="val">${v(data.wilayaNaissance)}</span>
</div>

<div class="row">
  <span class="lbl">../../..</span><span class="val">${formatDate(data.dateNaissance)}</span>
  <span class="lbl" style="margin-right:8px;">المسمى(ة)</span>
  <span class="val" style="font-size:13px;">${v(data.fullName)}</span>
  <span class="fill">&nbsp;</span>
</div>

<div class="row">
  <span class="lbl">السن</span>
  <span class="val">${data.sexe === 'M' ? 'ذكر' : data.sexe === 'F' ? 'أنثى' : '......'}</span>
  <span class="fill">&nbsp;</span>
</div>

<div class="row">
  <span class="lbl">ابن(ة)</span><span class="val">${v(data.pereNomPrenom)}</span><span class="fill">&nbsp;</span>
  <span class="lbl">عمره</span><span class="val">${v(data.pereAge, '......')}</span>
  <span class="lbl">مهنته</span><span class="val">${v(data.pereMetier, '......')}</span><span class="fill">&nbsp;</span>
</div>

<div class="row">
  <span class="lbl">و</span><span class="val">${v(data.mereNomPrenom)}</span><span class="fill">&nbsp;</span>
  <span class="lbl">عمرها</span><span class="val">${v(data.mereAge, '......')}</span>
  <span class="lbl">مهنتها</span><span class="val">${v(data.mereMetier, '......')}</span><span class="fill">&nbsp;</span>
</div>

<div class="row">
  <span class="lbl">الساكنين</span><span class="fill">&nbsp;</span>
  <span class="lbl">بلدية</span><span class="val">${v(data.domicileCommune)}</span>
  <span class="lbl">ولاية</span><span class="val">${v(data.domicileWilaya)}</span>
</div>

<div class="row">
  <span class="lbl">حرر في</span><span class="fill">&nbsp;</span>
  <span class="lbl">على الساعة</span><span class="fill">${formatTime(data.heureRedaction)}</span>
</div>

<div class="row">
  <span class="lbl">إبعلان أدلى به السيد(ة)</span>
  <span class="val">${v(data.declarePar, '')}</span><span class="fill">&nbsp;</span>
</div>
<div class="row"><span class="fill">&nbsp;</span></div>

<div class="row">
  <span class="lbl">وبعد التلاوة وقع معنا نحن</span>
  <span class="val">${v(data.officierEtatCivil, '')}</span><span class="fill">&nbsp;</span>
  <span class="lbl">ضابط الحالة المدنية ببلدية</span>
</div>

<div class="row">
  <span class="lbl">البيانات الهامشية</span>
  <span class="fill">${v(data.marginalNotes, '')}&nbsp;</span>
</div>
<div class="row"><span class="fill">&nbsp;</span></div>
<div class="row"><span class="fill">&nbsp;</span></div>
<div class="row"><span class="fill">&nbsp;</span></div>
<div class="row"><span class="fill">&nbsp;</span></div>

<div class="issue">
  حررت بـ <strong>${v(data.redigeA, v(data.domicileCommune, 'مستغانم'))}</strong> ......في...... <strong>${today}</strong>
</div>

<div class="latin">
  <p class="red">الكتابة السابقة للاسم واللقب بالأحرف اللاتينية</p>
  <div class="line">&nbsp;</div>
</div>

<div class="notes">
  <p>1- بكامل الحروف</p>
  <p>2- اسم ولقب الأولاد</p>
</div>

<div class="footer">
  مستخرج من السجل الوطني للحالة المدنية
  <br/><small>المرجع: ج م 7</small>
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
