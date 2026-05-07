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

// ── Generate PDF from DB row ─────────────────────────────────────────────────
export async function generateCertificatePDF(requestId) {
  // 1. Pull the record from register.actes_naissance
  const actes_naissance = await fetchActeNaissance(requestId);

  const now = new Date();
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const formatDate = (d) => {
    if (!d) return '../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const formatTime = (t) => (t ? String(t).substring(0, 5) : '......');
  const v = (val, fallback = '..........') => (val ? String(val) : fallback);

  // 2. Map DB column names → template variables
  //    Adjust the left-hand keys if your column names differ in Supabase
  const d = {
    numeroChahada: actes_naissance.numero_chahada ?? actes_naissance.numeroChahada,
    dateNaissance: actes_naissance.date_naissance ?? actes_naissance.dateNaissance,
    heureNaissance: actes_naissance.heure_naissance ?? actes_naissance.heureNaissance,
    communeNaissance: actes_naissance.commune_naissance ?? actes_naissance.communeNaissance,
    wilayaNaissance: actes_naissance.wilaya_naissance ?? actes_naissance.wilayaNaissance,
    fullName: actes_naissance.full_name ?? actes_naissance.fullName,
    genre: actes_naissance.genre,
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

  const html = `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>شهادة الميلاد</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; direction: rtl; background: #fff; color: #000; }
  .container { width: 850px; margin: auto; padding: 40px 50px; }
  .header-top { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
  .header-right { text-align: right; font-size: 14px; line-height: 1.9; margin-bottom: 20px; }
  .title-block { text-align: center; margin: 20px 0 4px; }
  .title-block h1 { font-size: 30px; font-weight: bold; }
  .title-block .subtitle { font-size: 15px; margin-top: 4px; }
  .rows { margin-top: 28px; }
  .row { display: flex; align-items: flex-end; width: 100%; margin-bottom: 10px; font-size: 14.5px; }
  .lbl { white-space: nowrap; padding-left: 4px; padding-right: 2px; }
  .dots { flex: 1; border-bottom: 1px dotted #000; min-width: 30px; margin: 0 4px 3px; }
  .val { white-space: nowrap; padding-left: 4px; padding-right: 2px; }
  .row-split { display: flex; width: 100%; margin-bottom: 10px; font-size: 14.5px; align-items: flex-end; justify-content: space-between;direction: rtl; }
  .row-split .right-part { display: flex; flex: 1; align-items: flex-end;gap: 8px; justify-content: flex-start; }
  .row-split .left-label { white-space: nowrap; padding-left: 10px;padding-right: 0;font-size: 13px;font-weight: 500; }
  .row-split .right-part .lbl { white-space: nowrap;}
  .row-split .right-part .dots {flex: 1;border-bottom: 1px dashed #000;min-width: 60px;margin: 0 5px;}
  .row-split .right-part .val { white-space: nowrap;}
  .footer-section-right { margin-top: 30px; font-size: 14px; text-align: right; }
  .footer-bottom-left { margin-top: 20px; font-size: 13.5px; text-align: right; }
  .footer-bottom-left .latin-line { text-align: right; margin-bottom: 6px; }
  .footer-bottom-left .notes { text-align: right; font-size: 13px; line-height: 1.9; margin-top: 6px; }
  .footer-bottom-left .bold-center { text-align: center; font-weight: bold; font-size: 14px; margin-top: 6px; }
  .footer-bottom-left .ref { text-align: center; font-size: 13px; }
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

    <div class="row-split">
      <div class="right-part">
        <span class="lbl">في يوم</span>
        <span class="dots"></span>
        <span class="val">${formatDate(d.dateNaissance)}</span>
      </div>
      <span class="left-label">رقم الشهادة &nbsp; ${v(d.numeroChahada)}</span>
</div>

    <div class="row">
      <span class="dots"></span>
      <span class="lbl">على الساعة</span>
      <span class="dots"></span>
      <span class="val">${formatTime(d.heureNaissance)}</span>
      <span class="dots"></span>
      <span class="lbl">ولد(ت)ب.</span>
      <span class="dots"></span>
      <span class="val">${v(d.communeNaissance)}</span>
    </div>

    <div class="row">
      <span class="lbl">بلدية</span>
      <span class="dots"></span>
      <span class="val">${v(d.communeNaissance)}</span>
      <span class="dots"></span>
      <span class="lbl">ولاية.</span>
      <span class="dots"></span>
      <span class="val">${v(d.wilayaNaissance)}</span>
    </div>

    <div class="row-split">
      <div class="right-part">
        <span class="lbl">المسمى(ة)</span>
        <span class="dots"></span>
        <span class="val"><strong>${v(d.fullName)}</strong></span>
        <span class="dots"></span>
      </div>
      <span class="left-label">${formatDate(d.dateNaissance)}</span>
    </div>

    <div class="row">
      <span class="lbl">الجنس</span>
      <span class="dots"></span>
      <span class="val">${v(d.genre)}</span>
      <span class="dots"></span>
    </div>

    <div class="row">
      <span class="lbl">ابن(ة)</span>
      <span class="dots"></span>
      <span class="val">${v(d.pereNomPrenom)}</span>
      <span class="dots"></span>
      <span class="lbl">عمره.</span>
      <span class="dots"></span>
      <span class="val">/////</span>
      <span class="lbl">مهنة.</span>
      <span class="dots"></span>
      <span class="val">/////</span>
      <span class="dots"></span>
    </div>

    <div class="row">
      <span class="lbl">و</span>
      <span class="dots"></span>
      <span class="val">${v(d.mereNomPrenom)}</span>
      <span class="dots"></span>
      <span class="lbl">عمرها</span>
      <span class="dots"></span>
      <span class="val">/////</span>
      <span class="lbl">مهنتها.</span>
      <span class="dots"></span>
      <span class="val">/////</span>
      <span class="dots"></span>
    </div>

    <div class="row">
      <span class="lbl">الساكنين.</span>
      <span class="dots"></span>
      <span class="val">${v(d.domicileCommune)}</span>
      <span class="dots"></span>
      <span class="lbl">بلدية.</span>
      <span class="dots"></span>
      <span class="lbl">ولاية.</span>
      <span class="dots"></span>
      <span class="val">${v(d.domicileWilaya)}</span>
    </div>

    <div class="row">
      <span class="lbl">حرر في</span>
      <span class="dots"></span>
      <span class="lbl">على الساعة...</span>
      <span class="dots"></span>
      <span class="val">${formatTime(d.heureRedaction)}</span>
      <span class="dots"></span>
    </div>

    <div class="row">
      <span class="lbl">بإعلان أدلى به السيد(ة)</span>
      <span class="dots"></span>
      <span class="val">${v(d.declarePar)}</span>
      <span class="dots"></span>
    </div>

    <div class="row"><span class="dots"></span></div>

    <div class="row">
      <span class="lbl">وبعد التلاوة وقع معنا نحن</span>
      <span class="dots"></span>
      <span class="val">${v(d.officierEtatCivil)}</span>
      <span class="dots"></span>
      <span class="lbl">ضابط الحالة المدنية ببلدية</span>
    </div>

    <div class="row">
      <span class="lbl">البيانات الهامشية</span>
      <span class="dots"></span>
      <span class="val">${v(d.marginalNotes)}</span>
      <span class="dots"></span>
    </div>

    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>

  </div>

  <div class="footer-section-right">
    <div class="row">
      <span class="lbl">حررت ب. مستغانم ......</span>
      <span class="lbl">في...</span>
      <span class="val">${today}</span>
      <span class="lbl">.../.../...</span>
    </div>
  </div>

  <div class="footer-bottom-left">
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

// ── Email sender ─────────────────────────────────────────────────────────────
export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, requestId) {
    const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS;

    // Generate PDF filled from DB
    const pdfBuffer = await generateCertificatePDF(requestId);

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