import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { supabase } from '../supabaseClient.js';

export async function initializeEmail() {
  console.log('Brevo API Service ready');
  return true;
}

// ── Fetch acte from DB ───────────────────────────────────────────────────────
export async function fetchActeNaissance(requestId) {
  const { data, error } = await supabase
    .schema('register')
    .from('actes_naissance')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    console.error(' DB fetch error:', error);
    throw new Error(`Could not fetch acte_naissance with id=${requestId}: ${error.message}`);
  }
  return data;
}

// ── Generate PDF from DB row or Object ──────────────────────────────────────
export async function generateCertificatePDF(input) {
  let actes_naissance;
  if (typeof input === 'string') {
    actes_naissance = await fetchActeNaissance(input);
  } else {
    actes_naissance = input || {};
  }

  const now = new Date();
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const formatDate = (d) => {
    if (!d) return '../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const formatTime = (t) => (t ? String(t).substring(0, 5) : '......');
  const v = (val, fallback = '..........') => (val ? String(val) : fallback);

  const rawType = actes_naissance.subject || actes_naissance.type_document || actes_naissance.requestSubject || '';
  console.log(' [PDF Gen] Raw type received:', rawType);

  const dType = rawType.toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '');

  console.log(' [PDF Gen] Normalized type:', dType);

  const isResidenceCard = dType.includes('residence') || dType.includes('sejour') || dType.includes('carte');
  console.log(' [PDF Gen] isResidenceCard:', isResidenceCard);

  let html = '';

  if (isResidenceCard) {
    // ─── RESIDENCE CARD TEMPLATE (بطاقة إقامة) ─────────────────────────────
    const d = {
      fullName: actes_naissance.fullName || actes_naissance.nom_prenom || `${actes_naissance.firstName || ''} ${actes_naissance.lastName || ''}`.trim(),
      dateNaissance: actes_naissance.date_naissance || actes_naissance.dateNaissance || '',
      lieuNaissance: actes_naissance.lieu_naissance || actes_naissance.lieuNaissance || actes_naissance.commune_naissance || '',
      adresse: actes_naissance.adresse || actes_naissance.citizen_address || '',
      wilaya: actes_naissance.wilaya || actes_naissance.domicile_wilaya || 'مستغانم',
      daira: actes_naissance.daira || actes_naissance.domicile_daira || 'مستغانم',
      commune: actes_naissance.commune || actes_naissance.domicile_commune || 'مستغانم',
      nationalite: actes_naissance.nationalite || 'جزائرية',
      profession: actes_naissance.profession || actes_naissance.metier || '',
      presidentName: actes_naissance.president_name || actes_naissance.presidentName || 'ولد عابد مشري',
    };

    html = `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>بطاقة إقامة</title>
<style>
  @page {
    size: A4;
    margin: 15mm 18mm 15mm 18mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Arial', 'DejaVu Sans', sans-serif;
    direction: rtl;
    background: #fff;
    color: #000;
    font-size: 14px;
    line-height: 2.2;
  }
  .page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .header { 
    text-align: center; 
    margin-bottom: 10px; 
    font-size: 16px;
    line-height: 1.8;
  }
  .header p { 
    margin: 4px 0; 
    font-size: 16px;
  }
  .header strong {
    font-size: 18px;
    font-weight: bold;
  }
  .location { 
    text-align: right; 
    font-size: 14px; 
    margin-bottom: 15px; 
    line-height: 2.0; 
  }
  .location p {
    margin: 2px 0;
  }
  .title-block { 
    text-align: center; 
    margin: 20px 0 15px; 
  }
  .title-block .box {
    border: 2px solid #000;
    border-radius: 8px;
    display: inline-block;
    padding: 12px 60px;
    min-width: 300px;
  }
  .title-block h1 { 
    font-size: 32px; 
    font-weight: bold; 
    margin: 0; 
  }
  .title-block .subtitle {
    font-size: 14px;
    margin-top: 5px;
  }
  .content { 
    font-size: 14px; 
    line-height: 2.4; 
    margin-top: 20px;
    flex: 1;
  }
  .content p { 
    margin-bottom: 10px; 
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .dotted {
    border-bottom: 1px dotted #000;
    display: inline-block;
    min-width: 100px;
    padding: 0 8px;
    font-weight: bold;
    text-align: center;
    flex: 1;
    margin: 0 5px;
    height: 20px;
  }
  .dotted-fixed {
    border-bottom: 1px dotted #000;
    display: inline-block;
    min-width: 150px;
    padding: 0 8px;
    font-weight: bold;
    text-align: center;
    margin: 0 5px;
    height: 20px;
  }
  .cert-statement {
    text-align: center;
    font-weight: bold;
    font-size: 20px;
    margin: 25px 0 20px;
  }
  .footer { 
    margin-top: 30px; 
    font-size: 14px; 
    line-height: 2.0; 
  }
  .footer p {
    margin-bottom: 8px;
  }
  .footer .note { 
    margin-top: 20px; 
    font-size: 13px; 
    border-top: 1px solid #ccc; 
    padding-top: 12px; 
  }
  .footer .note p {
    margin: 5px 0;
  }
  .latin-line {
    margin-top: 15px;
    font-size: 13px;
    border-top: 1px solid #ccc;
    padding-top: 10px;
    text-align: right;
  }
  .latin-dotted {
    border-bottom: 1px dotted #000;
    display: inline-block;
    min-width: 250px;
    height: 20px;
    margin-top: 5px;
  }
  .signature-area {
    margin-top: 20px;
    text-align: left;
    direction: rtl;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <p><strong>الجمهورية الجزائرية الديموقراطية الشعبية</strong></p>
    <p>وزارة الداخلية</p>
  </div>
  <div class="location">
    <p>ولاية <strong>${d.wilaya}</strong></p>
    <p>دائرة <strong>${d.daira}</strong></p>
    <p>بلدية <strong>${d.commune}</strong></p>
  </div>
  <div class="title-block">
    <div class="box">
      <h1>بطاقة إقامة</h1>
      <div class="subtitle">نسخة الكترونية</div>
    </div>
  </div>
  <div class="content">
    <p>نَحْنُ <span class="dotted">${v(d.presidentName, 'ولد عابد مشري')}</span></p>
    <p>رَئِيسُ الْمَجْلِسِ الشَّعْبِيِّ الْبَلَدِيِّ لِبَلَدِيَّةِ: <span class="dotted-fixed">${d.commune}</span></p>
    <div class="cert-statement">نَشْهَدُ بِأَنَّ:</div>
    <p>السيد(ة) <span class="dotted">${d.fullName}</span></p>
    <p>المولود ب <span class="dotted">${v(d.lieuNaissance)}</span> بتاريخ <span class="dotted">${formatDate(d.dateNaissance)}</span></p>
    <p>الجنسية <span class="dotted">${v(d.nationalite, 'جزائرية')}</span> المهنة <span class="dotted">${v(d.profession)}</span></p>
    <p>السكن <span class="dotted">${v(d.adresse)}</span></p>
    <p style="text-align: center; margin-top: 12px; display: block;">يقيم بنفس العنوان مُنْذُ أَكْثَرَ مِنْ سِتَّةِ (6) أَشْهُرٍ</p>
    <p style="text-align: center; margin-top: 10px; display: block;">وَقَدْ سُلِّمَتْ لَهُ هَذِهِ الشَّهَادَةُ لِلْإِدْلَاءِ بِهَا فِي حُدُودِ مَا يَسْمَحُ بِهِ الْقَانُونُ</p>
  </div>
  <div class="footer">
    <div class="signature-area">
      <p>حرر ب <strong>${d.commune}</strong> بتاريخ <strong>${today}</strong></p>
    </div>
    <p style="text-align: center; margin-top: 12px; display: block;">وَالْغَرَضُ مِنْ مَنْحِ هَذِهِ الشَّهَادَةِ هُوَ إِثْبَاتُ السَّكَنِ</p>
    <div class="note">
      <p>(1) إِنَّ صَلَاحِيَّةَ الْعَمَلِ بِهَذِهِ الشَّهَادَةِ لَا يُمْكِنُ أَنْ تَتَجَاوَزَ سِتَّةَ (6) أَشْهُرٍ</p>
    </div>
    <div class="latin-line">
      <p>الكتابة السابقة للاسم والقب</p>
      <p><span class="latin-dotted">&nbsp;</span></p>
    </div>
  </div>
</div>
</body>
</html>`;
  } else {
    // ─── BIRTH CERTIFICATE TEMPLATE (شهادة الميلاد) ────────────────────────
    const d = {
      numeroChahada: actes_naissance.numero_chahada ?? actes_naissance.numeroChahada ?? actes_naissance.numeroActe,
      dateNaissance: actes_naissance.date_naissance ?? actes_naissance.dateNaissance,
      heureNaissance: actes_naissance.heure_naissance ?? actes_naissance.heureNaissance,
      communeNaissance: actes_naissance.commune_naissance ?? actes_naissance.communeNaissance,
      wilayaNaissance: actes_naissance.wilaya_naissance ?? actes_naissance.wilayaNaissance,
      fullName: actes_naissance.nom_prenom ?? actes_naissance.full_name ?? actes_naissance.fullName,
      genre: actes_naissance.genre ?? actes_naissance.sexe,
      pereNomPrenom: actes_naissance.pere_nom_prenom ?? actes_naissance.pereNomPrenom,
      pereAge: actes_naissance.pere_age ?? actes_naissance.pereAge,
      pereMetier: actes_naissance.pere_metier ?? actes_naissance.pereMetier,
      mereNomPrenom: actes_naissance.mere_nom_prenom ?? actes_naissance.mereNomPrenom,
      mereAge: actes_naissance.mere_age ?? actes_naissance.mereAge,
      mereMetier: actes_naissance.mere_metier ?? actes_naissance.mereMetier,
      domicileCommune: actes_naissance.domicile_commune ?? actes_naissance.domicileCommune,
      domicileWilaya: actes_naissance.domicile_wilaya ?? actes_naissance.domicileWilaya,
      heureRedaction: actes_naissance.heure_redaction ?? actes_naissance.heureRedaction,
      declarePar: actes_naissance.declare_par ?? actes_naissance.declarePar,
      officierEtatCivil: actes_naissance.officier_etat_civil ?? actes_naissance.officierEtatCivil,
      marginalNotes: actes_naissance.marginal_notes ?? actes_naissance.marginalNotes,
      fullNameLatin: actes_naissance.full_name_latin ?? actes_naissance.fullNameLatin,
    };

    const html = ` <!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>شهادة الميلاد</title>
  <style>
    body{
      margin:0;
      padding:0;
      background:#f2f2f2;
      font-family: "Tahoma", "Arial", sans-serif;
    }
    .page{
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background: #fff;
      color:#000;
      box-sizing:border-box;
      padding: 18mm 14mm 16mm 14mm;
      position: relative;
      box-shadow: 0 0 10px rgba(0,0,0,.15);
    }
    .top-right{
      position:absolute;
      top:18mm;
      right:14mm;
      text-align:right;
      font-size:14px;
      line-height:1.8;
    }
    .center-title{
      text-align:center;
      margin-top:55px;
    }
    .center-title h1{
      margin:0;
      font-size:32px;
      font-weight:700;
    }
    .center-title h2{
      margin:10px 0 0;
      font-size:18px;
      font-weight:400;
    }
    .form{
      margin-top:35px;
      font-size:18px;
      line-height:2.4;
    }
    .row{
      display:flex;
      align-items:flex-end;
      gap:8px;
      white-space:nowrap;
      margin: 2px 0;
    }
    .label{
      min-width:max-content;
      font-size:18px;
    }
    .line{
      flex:1;
      border-bottom:1px dotted #222;
      height: 18px;
      transform: translateY(-4px);
    }
    .short{
      flex:0 0 70px;
    }
    .very-short{
      flex:0 0 40px;
    }
    .two-lines{
      margin-top:18px;
    }
    .note{
      margin-top:28px;
      font-size:16px;
      line-height:2.1;
    }
    .footer{
      position:absolute;
      bottom:16mm;
      right:14mm;
      left:14mm;
      font-size:14px;
      line-height:1.8;
    }
    .footer .small{
      font-size:13px;
    }
    .bottom-right{
      text-align:right;
      margin-top:18px;
      font-size:14px;
    }
    .bottom-center{
      text-align:center;
      margin-top:18px;
    }
    @media print{
      body{ background:#fff; }
      .page{
        margin:0;
        box-shadow:none;
        width:auto;
        min-height:auto;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top-right">
      <div>وزارة الداخلية والجماعات المحلية</div>
      <div>السجل الوطني للحالة المدنية</div>
    </div>

    <div class="center-title">
      <h1>شهادة الميلاد</h1>
      <h2>نسخة إلكترونية</h2>
    </div>

    <div class="form">
      <div class="row">
        <span class="label">رقم الشهادة</span>
        <span class="line short" style="padding-right:10px;">${v(d.numeroChahada)}</span>
      </div>

      <div class="row">
        <span class="label">في يوم</span>
        <span class="line" style="padding-right:10px;">${formatDate(d.dateNaissance)}</span>
      </div>

      <div class="row">
        <span class="label">على الساعة</span>
        <span class="line" style="padding-right:10px;">${formatTime(d.heureNaissance)}</span>
      </div>

      <div class="row">
        <span class="label">ببلدية</span>
        <span class="line" style="padding-right:10px;">${v(d.communeNaissance)}</span>
      </div>

      <div class="row">
        <span class="label">المسمى (ة)</span>
        <span class="line" style="padding-right:10px;"><strong>${v(d.fullName)}</strong></span>
      </div>

      <div class="row">
        <span class="label">الجنس</span>
        <span class="line short" style="padding-right:10px;">${v(d.genre)}</span>
      </div>

      <div class="row">
        <span class="label">ابن (ة)</span>
        <span class="line" style="padding-right:10px;">${v(d.pereNomPrenom)}</span>
        <span class="label">عمره</span>
        <span class="line very-short" style="padding-right:10px;">${v(d.pereAge, '///')}</span>
        <span class="label">سنة</span>
      </div>

      <div class="row">
        <span class="label">و</span>
        <span class="line" style="padding-right:10px;">${v(d.mereNomPrenom)}</span>
        <span class="label">عمرها</span>
        <span class="line very-short" style="padding-right:10px;">${v(d.mereAge, '///')}</span>
        <span class="label">سنة</span>
      </div>

      <div class="row">
        <span class="label">الساكنين</span>
        <span class="line" style="padding-right:10px;">${v(d.domicileCommune)}</span>
        <span class="label">ولاية</span>
        <span class="line very-short" style="padding-right:10px;">${v(d.domicileWilaya, '///')}</span>
      </div>

      <div class="row">
        <span class="label">حرر في</span>
        <span class="line short" style="padding-right:10px;">${v(d.communeNaissance)}</span>
        <span class="label">بتاريخ</span>
        <span class="line" style="padding-right:10px;">${today}</span>
      </div>

      <div class="row">
        <span class="label">بإعلان أدلى به السيد (ة)</span>
        <span class="line" style="padding-right:10px;">${v(d.declarePar)}</span>
      </div>

      <div class="row">
        <span class="label">وبعد القراءة وقع معنا نحن</span>
        <span class="line" style="padding-right:10px;">${v(d.officierEtatCivil)}</span>
      </div>

      <div class="row">
        <span class="label">ضابط الحالة المدنية بلدية</span>
        <span class="line" style="padding-right:10px;">${v(d.communeNaissance)}</span>
      </div>

      <div class="row">
        <span class="label">البيانات الهامشية</span>
        <span class="line" style="padding-right:10px;">${v(d.marginalNotes)}</span>
      </div>

      <div class="row">
        <span class="label">...............................................................</span>
      </div>

      <div class="row">
        <span class="label">...............................................................</span>
      </div>

      <div class="row">
        <span class="label">...............................................................</span>
      </div>

      <div class="row">
        <span class="label">...............................................................</span>
      </div>

      <div class="row">
        <span class="label">...............................................................</span>
      </div>
    </div>

    <div class="footer">
      <div class="bottom-center">حررت ب <strong>${v(d.communeNaissance, 'مستغانم')}</strong> في <strong>${today}</strong></div>

      <div class="bottom-right">
        <div>الكتابة السابقة للاسم واللقب بأحرف لاتينية</div>
        <div class="line" style="margin-top:10px;"></div>
        <div class="small" style="margin-top:14px;">-1- كمال الحروف</div>
        <div class="small">-2- و.د.البلد</div>
        <div class="small" style="font-weight:700;">مستخرج من السجل الوطني للحالة المدنية</div>
        <div class="small">الموقع :</div>
      </div>
    </div>
  </div>
</body>
</html>
`;
  }

  let browser;
  try {
    const execPath = await chromium.executablePath();
    console.log(' [PDF] Launching Chromium from:', execPath);

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

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

// ── Email sender ─────────────────────────────────────────────────────────────
export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBufferOrId) {
    const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS;

    let pdfBuffer;
    if (Buffer.isBuffer(pdfBufferOrId)) {
      pdfBuffer = pdfBufferOrId;
    } else {
      pdfBuffer = await generateCertificatePDF(pdfBufferOrId);
    }

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
            <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || "service d'état civil"}</strong></p>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
            Baladiya Digital — Document généré automatiquement
          </div>
        </div>
      `,
      attachment: [{
        content: pdfBuffer.toString('base64'),
        name: (requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence')))
          ? 'Fiche_de_Residence.pdf'
          : 'Acte_de_Naissance.pdf',
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
