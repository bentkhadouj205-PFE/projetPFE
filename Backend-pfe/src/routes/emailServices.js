import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

/**
 * Generates a high-quality PDF using Puppeteer
 */
export async function generateCertificatePDF(data) {
  console.log("  -> [Puppeteer] Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log("  -> [Puppeteer] Opening new page...");
  const page = await browser.newPage();

  const now = new Date();
  const todayAr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body {
          font-family: 'Amiri', serif;
          margin: 0;
          padding: 0;
          background-color: #fff;
          color: #111;
          direction: rtl;
          text-align: right;
        }
        .certificate-container {
          width: 210mm;
          height: 297mm;
          padding: 20mm;
          box-sizing: border-box;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .republic-header {
          text-align: center;
          flex: 1;
        }
        .ministry-header {
          font-size: 14px;
          line-height: 1.4;
        }
        .title-section {
          text-align: center;
          margin: 30px 0 20px;
        }
        .title-section h1 {
          font-size: 32px;
          margin: 0;
        }
        .title-section p {
          font-size: 14px;
          color: #555;
          margin: 5px 0;
        }
        .cert-info {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .dotted-line {
          border-bottom: 1px dotted #333;
          display: inline-block;
          min-width: 100px;
        }
        .body-content {
          font-size: 16px;
          line-height: 2.2;
        }
        .field-label {
          font-weight: normal;
        }
        .field-value {
          font-weight: bold;
        }
        .footer-section {
          margin-top: 50px;
          border-top: 1px solid #eee;
          padding-top: 20px;
          text-align: center;
        }
        .latin-note {
          color: #d32f2f;
          font-weight: bold;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="header">
          <div class="republic-header">
            <h2 style="margin:0;">الجمهورية الجزائرية الديموقراطية الشعبية</h2>
          </div>
          <div class="ministry-header">
            <p style="margin:0;">وزارة الداخلية والجماعات المحلية</p>
            <p style="margin:0; font-weight:bold;">السجل الوطني للحالة المدنية</p>
          </div>
        </div>

        <div class="title-section">
          <h1>شهادة الميلاد</h1>
          <p>نسخة إلكترونية</p>
        </div>

        <div class="cert-info">
          <span>السنة: <span class="field-value">${data.actYear || '....'}</span></span>
          <span>رقم الشهادة: <span class="field-value">${data.actNumber || '..........'}</span></span>
        </div>

        <div class="body-content">
          <p>في يوم <span class="dotted-line" style="width:150px;"></span> على الساعة <span class="dotted-line" style="width:100px;"></span></p>
          <p>ولد(ت) ب <span class="dotted-line" style="width:120px;"></span> ولاية <span class="field-value">${data.wilaya || '............'}</span></p>
          <p>المسمى(ة): <span class="field-value" style="font-size:20px;">${data.fullName}</span></p>
          <p>الجنس: <span class="dotted-line" style="width:150px;"></span></p>
          <p>ابن(ة) <span class="dotted-line" style="width:150px;"></span> عمره <span class="dotted-line" style="width:50px;"></span> مهنته <span class="dotted-line" style="width:120px;"></span></p>
          <p>و <span class="dotted-line" style="width:150px;"></span> عمرها <span class="dotted-line" style="width:50px;"></span> مهنتها <span class="dotted-line" style="width:120px;"></span></p>
          <p>الساكنين ب بلدية <span class="field-value">${data.commune || '............'}</span> ولاية <span class="field-value">${data.wilaya || '............'}</span></p>
          <p>حرر في <span class="dotted-line" style="width:150px;"></span> على الساعة <span class="dotted-line" style="width:80px;"></span></p>
          <p>يُعلان به السيد(ة) <span class="dotted-line" style="width:250px;"></span></p>
          <p style="font-weight:bold;">وبعد التلاوة وقّع معنا نحن <span class="dotted-line" style="width:150px;"></span> ضابط الحالة المدنية بالبلدية</p>
          <p>البيانات الهامشية: <span class="dotted-line" style="width:300px;"></span></p>
        </div>

        <div style="margin-top:40px; font-size:16px;">
          <p>حررت ب <span class="field-value">${data.commune || 'مستقانم'}</span> في <span class="field-value">${todayAr}</span></p>
        </div>

        <div class="footer-section">
          <div class="latin-note">الكتابة السابقة للاسم واللقب بالأحرف اللاتينية</div>
          <p style="margin-top:30px; font-weight:bold; font-size:18px;">مستخرج من السجل الوطني للحالة المدنية</p>
          <p style="color:#666; font-size:12px;">المرجع: 7</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("  -> [Puppeteer] Setting content...");
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  console.log("  -> [Puppeteer] Generating PDF...");
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log("  -> [Puppeteer] Closing browser...");
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