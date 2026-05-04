import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

/**
 * Generates a high-quality PDF using Puppeteer
 */
export async function generateCertificatePDF(data) {
  console.log("-> [Puppeteer] Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const now = new Date();
  const todayAr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  // البيانات الهامشية
  let marginalText = 'لا شيء';
  if (data.marginal_status === 'married') marginalText = `تزوج(ت) بـ ${data.marginal_spouse || ''}`;
  if (data.marginal_status === 'divorced') marginalText = `طُلِّق(ت) من ${data.marginal_spouse || ''}`;

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Amiri', serif;
      direction: rtl;
      text-align: right;
      font-size: 14px;
      color: #000;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .header-left { font-size: 13px; text-align: right; }
    .header-center { text-align: center; flex: 1; }
    h1 { font-size: 28px; text-align: center; margin: 15px 0 5px; }
    .subtitle { text-align: center; font-size: 14px; margin-bottom: 15px; }
    .divider { border-top: 1.5px solid #000; margin: 8px 0; }
    .row {
      display: flex;
      align-items: baseline;
      margin: 6px 0;
      font-size: 14px;
      line-height: 1.8;
    }
    .label { white-space: nowrap; margin-left: 6px; }
    .dots {
      flex: 1;
      border-bottom: 1px dotted #555;
      margin: 0 6px;
      min-width: 40px;
    }
    .value {
      font-weight: bold;
      white-space: nowrap;
    }
    .marginal-box {
      border: 1px solid #999;
      padding: 8px 12px;
      margin: 10px 0;
      min-height: 80px;
      font-size: 13px;
      line-height: 2;
    }
    .footer {
      margin-top: 20px;
      font-size: 13px;
      line-height: 2;
    }
    .latin-section {
      margin-top: 15px;
      border-top: 1px solid #000;
      padding-top: 8px;
      font-size: 13px;
      color: #c00;
      font-weight: bold;
    }
    .official-footer {
      text-align: center;
      margin-top: 20px;
      font-weight: bold;
      font-size: 13px;
      border-top: 1.5px solid #000;
      padding-top: 8px;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- الترويسة -->
  <div class="header">
    <div class="header-center">
      <div style="font-size:16px; font-weight:bold;">الجمهورية الجزائرية الديموقراطية الشعبية</div>
    </div>
    <div class="header-left">
      <div>وزارة الداخلية والجماعات المحلية</div>
      <div style="font-weight:bold;">السجل الوطني للحالة المدنية</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- العنوان -->
  <h1>شهادة الميلاد</h1>
  <div class="subtitle">نسخة إلكترونية</div>

  <div class="divider"></div>

  <!-- رقم الشهادة + اليوم -->
  <div class="row">
    <span class="label">رقم الشهادة</span>
    <span class="dots"></span>
    <span class="value">${data.actNumber || ''}</span>
    <span class="label" style="margin-right:20px;">في يوم</span>
    <span class="dots"></span>
    <span class="value">${data.birth_day || ''}</span>
  </div>

  <!-- على الساعة + ولد(ت) ب -->
  <div class="row">
    <span class="label">على الساعة</span>
    <span class="dots"></span>
    <span class="value">${data.birth_time || ''}</span>
    <span class="label" style="margin-right:20px;">ولد(ت) ب</span>
    <span class="dots"></span>
    <span class="value">${data.birth_commune || data.commune || ''}</span>
  </div>

  <!-- بلدية + ولاية -->
  <div class="row">
    <span class="label">بلدية</span>
    <span class="dots"></span>
    <span class="value">${data.birth_commune || data.commune || ''}</span>
    <span class="label" style="margin-right:20px;">ولاية</span>
    <span class="dots"></span>
    <span class="value">${data.wilaya || ''}</span>
  </div>

  <!-- المسمى + تاريخ الميلاد -->
  <div class="row">
    <span class="label">المسمى(ة)</span>
    <span class="dots"></span>
    <span class="value" style="font-size:16px;">${data.fullName || ''}</span>
    <span class="label" style="margin-right:20px;">${data.birth_date_nums || data.actYear || ''}</span>
  </div>

  <!-- الجنس -->
  <div class="row">
    <span class="label">الجنس</span>
    <span class="dots"></span>
    <span class="value">${data.gender || ''}</span>
  </div>

  <!-- ابن(ة) الأب -->
  <div class="row">
    <span class="label">ابن(ة)</span>
    <span class="dots"></span>
    <span class="value">${data.father_name || ''}</span>
    <span class="label" style="margin-right:10px;">عمره</span>
    <span class="dots"></span>
    <span class="value">${data.father_age || ''}</span>
    <span class="label" style="margin-right:10px;">مهنته</span>
    <span class="dots"></span>
    <span class="value">${data.father_job || ''}</span>
  </div>

  <!-- الأم -->
  <div class="row">
    <span class="label">و</span>
    <span class="dots"></span>
    <span class="value">${data.mother_name || ''}</span>
    <span class="label" style="margin-right:10px;">عمرها</span>
    <span class="dots"></span>
    <span class="value">${data.mother_age || ''}</span>
    <span class="label" style="margin-right:10px;">مهنتها</span>
    <span class="dots"></span>
    <span class="value">${data.mother_job || ''}</span>
  </div>

  <!-- الساكنين -->
  <div class="row">
    <span class="label">الساكنين</span>
    <span class="dots"></span>
    <span class="label">بلدية</span>
    <span class="dots"></span>
    <span class="value">${data.family_commune || data.commune || ''}</span>
    <span class="label" style="margin-right:10px;">ولاية</span>
    <span class="dots"></span>
    <span class="value">${data.family_wilaya || data.wilaya || ''}</span>
  </div>

  <!-- حرر في -->
  <div class="row">
    <span class="label">حرر في</span>
    <span class="dots"></span>
    <span class="value">${data.issued_city || data.commune || ''}</span>
    <span class="label" style="margin-right:20px;">على الساعة</span>
    <span class="dots"></span>
    <span class="value">${data.issued_time || ''}</span>
  </div>

  <!-- إبعلان أدلى به -->
  <div class="row">
    <span class="label">إبعلان أدلى به السيد(ة)</span>
    <span class="dots"></span>
    <span class="value">${data.declarant || ''}</span>
  </div>

  <!-- وبعد التلاوة -->
  <div class="row">
    <span class="label">وبعد التلاوة وقع معنا نحن</span>
    <span class="dots"></span>
    <span class="value">${data.officer_name || ''}</span>
    <span class="label" style="margin-right:10px;">ضابط الحالة المدنية بالبلدية</span>
  </div>

  <!-- البيانات الهامشية -->
  <div style="margin-top:10px;">
    <div style="font-weight:bold; margin-bottom:5px;">البيانات الهامشية</div>
    <div class="marginal-box">
      ${marginalText}
    </div>
  </div>

  <!-- التوقيع والتاريخ -->
  <div class="footer">
    <div class="row">
      <span class="label">حررت بـ</span>
      <span class="dots"></span>
      <span class="value">${data.issued_city || data.commune || 'مستغانم'}</span>
      <span class="label" style="margin-right:20px;">في</span>
      <span class="dots"></span>
      <span class="value">${data.issued_date || todayAr}</span>
    </div>
  </div>

  <!-- الكتابة بالأحرف اللاتينية -->
  <div class="latin-section">
    <div>الكتابة السابقة للاسم واللقب بالأحرف اللاتينية</div>
    <div style="margin-top:5px; font-family: Arial; color:#000; font-weight:normal;">
      ${data.latin_name || ''}
    </div>
    <div style="margin-top:5px; font-size:12px; color:#000; font-weight:normal;">
      1- باكمل الحروف<br/>
      2- اسم ولقب الولد: ${data.child_name_latin || ''}
    </div>
  </div>

  <!-- المرجع الرسمي -->
  <div class="official-footer">
    مستخرج من السجل الوطني للحالة المدنية
    <div style="font-size:12px; margin-top:4px;">المرجع ج م 7</div>
  </div>

</div>
</body>
</html>`;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
  return pdfBuffer;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim()
  }
});

export async function initializeEmail() {
  try {
    await transporter.verify();
    console.log(' Gmail SMTP connected successfully:', process.env.SMTP_USER);
  } catch (error) {
    console.error('SMTP connection error:', error);
  }
}

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, status, employeeName, comment, pdfBuffer) {
    const subject = `Votre document est prêt 📄`;
    const text = `Bonjour ${citizenFirstName},\n\nNous vous informons que votre extrait d'acte de naissance est prêt.\n\nService: État Civil\nDate: ${new Date().toLocaleDateString('fr-FR')}\n\nCordialement,\nL'équipe Baladiya Digital`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1a3c8f; margin-bottom: 5px;">Baladiya Digital</h2>
          <p style="color: #666; margin-top: 0; font-size: 14px;">Service National de l'État Civil</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p>Bonjour <strong>${citizenFirstName}</strong>,</p>
          <p>Votre demande d'<strong>extrait d'acte de naissance</strong> a été traitée avec succès.</p>
          <div style="background: #f0f4ff; border-left: 4px solid #1a3c8f; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1a3c8f;">Détails du document :</strong><br/>
            <span style="color: #1a3c8f;">Service : État Civil</span><br/>
            <span style="color: #1a3c8f;">Date : ${new Date().toLocaleDateString('fr-FR')}</span>
          </div>
          <p>Le document officiel (PDF) est joint à ce message électronique.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Ceci est un message automatique, merci de ne pas y répondre.</p>
        </div>
      `;

    // Gmail SMTP sending
    const info = await transporter.sendMail({
      from: `"Baladiya Digital" <${(process.env.SMTP_USER || '').trim()}>`,
      replyTo: (process.env.SMTP_USER || '').trim(),
      to: (citizenEmail || '').trim(),
      subject,
      text,
      html,
      attachments: [
        {
          filename: 'certificat_naissance.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Email avec PDF envoyé (Gmail) à:', citizenEmail, '| ID:', info.messageId);
    return info;
  },

  async sendNotificationByPosition(position, title, message, serviceType) {
    // Basic notification logic
  }
};

export { transporter };