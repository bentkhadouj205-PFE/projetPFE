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

    html = `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>شهادة الميلاد</title>
<style>
  @page {
    size: A4;
    margin: 12mm 15mm 15mm 15mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Arial', 'DejaVu Sans', sans-serif; 
    direction: rtl; 
    background: #fff; 
    color: #000; 
    font-size: 13px;
    line-height: 1.6;
  }
  .page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .header-top { 
    text-align: center; 
    font-size: 18px; 
    font-weight: bold; 
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }
  .header-right { 
    text-align: right; 
    font-size: 13px; 
    line-height: 1.9; 
    margin-bottom: 15px;
    margin-top: 10px;
  }
  .title-block { 
    text-align: center; 
    margin: 20px 0 10px; 
  }
  .title-block h1 { 
    font-size: 36px; 
    font-weight: bold; 
    margin-bottom: 5px;
  }
  .title-block .subtitle { 
    font-size: 14px; 
    margin-top: 4px;
  }
  .rows { 
    margin-top: 30px;
    flex: 1;
  }
  .row { 
    display: flex; 
    align-items: flex-end; 
    width: 100%; 
    margin-bottom: 12px; 
    font-size: 13px;
    min-height: 24px;
  }
  .lbl { 
    white-space: nowrap; 
    padding-left: 4px; 
    padding-right: 2px; 
    font-size: 13px;
  }
  .dots { 
    flex: 1; 
    border-bottom: 1px dotted #000; 
    min-width: 20px; 
    margin: 0 4px 3px; 
    height: 14px;
  }
  .val { 
    white-space: nowrap; 
    padding-left: 4px; 
    padding-right: 2px; 
    font-size: 13px;
  }
  .row-split { 
    display: flex; 
    width: 100%; 
    margin-bottom: 12px; 
    font-size: 13px; 
    align-items: flex-end; 
    justify-content: space-between;
    direction: rtl; 
  }
  .row-split .right-part { 
    display: flex; 
    flex: 1; 
    align-items: flex-end;
    gap: 6px; 
    justify-content: flex-start; 
  }
  .row-split .left-label { 
    white-space: nowrap; 
    padding-left: 8px;
    font-size: 12px;
    font-weight: 500; 
  }
  .center-part {
    display: flex;
    align-items: flex-end;
    width: 100%;
  }
  .strong-name {
    font-weight: bold;
    font-size: 14px;
  }
  .extra-dots { 
    border-bottom: 1px dotted #000; 
    width: 100%; 
    margin: 10px 0; 
    height: 14px;
  }
  .footer-section-left {
    margin-top: 25px;
    text-align: left;
    direction: rtl;
  }
  .row-left {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    gap: 6px;
  }
  .footer-button-right {
    margin-top: 20px;
    text-align: right;
    margin-bottom: 10px;
  }
  .latin-line {
    text-align: right; 
    margin-bottom: 6px; 
    font-size: 12px;
  }
  .notes { 
    text-align: right; 
    font-size: 12px; 
    line-height: 1.8; 
    margin-top: 6px; 
  }
  .bold-center { 
    text-align: center; 
    font-weight: bold; 
    font-size: 13px; 
    margin-top: 8px; 
  }
  .ref { 
    text-align: center; 
    font-size: 12px; 
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="page">
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
         <span class="lbl">رقم الشهادة</span> 
         <span class="dots" style="min-width: 60px; flex: 0;"></span>
         <span class="val">${v(d.numeroChahada)}</span>
         <span class="dots" style="flex: 1;"></span>
         <span class="left-label">${formatDate(d.dateNaissance)}</span>
      </div>
    </div>
    <div class="row">
      <span class="lbl">في يوم</span>
      <span class="dots" style="min-width: 80px; flex: 0;"></span>
      <span class="val">${formatDate(d.dateNaissance)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">على الساعة</span>
      <span class="dots" style="min-width: 40px; flex: 0;"></span>
      <span class="val">${formatTime(d.heureNaissance)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">ولد(ت) ب</span>
      <span class="dots" style="min-width: 80px; flex: 0;"></span>
      <span class="val">${v(d.communeNaissance)}</span>
    </div>
    <div class="row">
      <span class="lbl">بلدية</span>
      <span class="dots" style="min-width: 100px; flex: 0;"></span>
      <span class="val">${v(d.communeNaissance)}</span> 
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">ولاية</span>  
      <span class="dots" style="min-width: 100px; flex: 0;"></span>
      <span class="val">${v(d.wilayaNaissance)}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row-split">
      <div class="center-part">
        <span class="lbl">المسمى(ة)</span>
        <span class="dots" style="min-width: 50px; flex: 0;"></span>
        <span class="val strong-name">${v(d.fullName)}</span>
        <span class="dots" style="flex: 1;"></span>
      </div>
    </div>
    <div class="row">
      <span class="lbl">الجنس</span>
      <span class="dots" style="min-width: 60px; flex: 0;"></span>
      <span class="val">${v(d.genre)}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">ابن(ة)</span>
      <span class="dots" style="min-width: 120px; flex: 0;"></span>
      <span class="val">${v(d.pereNomPrenom)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">عمره</span>
      <span class="dots" style="min-width: 30px; flex: 0;"></span>
      <span class="val">${v(d.pereAge, '/////')}</span>
      <span class="lbl">مهنة</span>
      <span class="dots" style="min-width: 30px; flex: 0;"></span>
      <span class="val">${v(d.pereMetier, '/////')}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">و</span>
      <span class="dots" style="min-width: 120px; flex: 0;"></span>
      <span class="val">${v(d.mereNomPrenom)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">عمرها</span>
      <span class="dots" style="min-width: 30px; flex: 0;"></span>
      <span class="val">${v(d.mereAge, '/////')}</span>
      <span class="lbl">مهنتها</span>
      <span class="dots" style="min-width: 30px; flex: 0;"></span>
      <span class="val">${v(d.mereMetier, '/////')}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">الساكنين</span>
      <span class="dots" style="min-width: 100px; flex: 0;"></span>
      <span class="val">${v(d.domicileCommune)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">بلدية</span>
      <span class="dots" style="min-width: 50px; flex: 0;"></span>
      <span class="val">${v(d.domicileCommune, '/////')}</span> 
      <span class="dots" style="flex: 1;"></span> 
      <span class="lbl">ولاية</span>   
      <span class="dots" style="min-width: 50px; flex: 0;"></span>
      <span class="val">${v(d.domicileWilaya, '/////')}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">حرر في</span>
      <span class="dots" style="min-width: 100px; flex: 0;"></span>
      <span class="val">${v(d.communeNaissance)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">على الساعة</span>
      <span class="dots" style="min-width: 40px; flex: 0;"></span>
      <span class="val">${formatTime(d.heureRedaction)}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">بإعلان أدلى به السيد(ة)</span>
      <span class="dots" style="min-width: 150px; flex: 0;"></span>
      <span class="val">${v(d.declarePar)}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="row">
      <span class="lbl">وبعد التلاوة وقع معنا نحن</span>
      <span class="dots" style="min-width: 120px; flex: 0;"></span>
      <span class="val">${v(d.officierEtatCivil)}</span>
      <span class="dots" style="flex: 1;"></span>
      <span class="lbl">ضابط الحالة المدنية ببلدية</span>
      <span class="dots" style="min-width: 80px; flex: 0;"></span>
      <span class="val">${v(d.communeNaissance)}</span>
    </div>
    <div class="row">
      <span class="lbl">البيانات الهامشية</span>
      <span class="dots" style="min-width: 250px; flex: 0;"></span>
      <span class="val">${v(d.marginalNotes)}</span>
      <span class="dots" style="flex: 1;"></span>
    </div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
    <div class="extra-dots"></div>
  </div>
  <div class="footer-section-left">
    <div class="row-left">
      <span class="lbl">حررت ب</span>
      <span class="dots" style="min-width: 60px; flex: 0;"></span>
      <span class="val">${v(d.communeNaissance, 'مستغانم')}</span>
      <span class="lbl">في</span>
      <span class="dots" style="min-width: 60px; flex: 0;"></span>
      <span class="val">${today}</span>
      <span class="lbl">.../.../...</span>
    </div>
  </div>
  <div class="footer-button-right">
    <div class="latin-line">الكتابة السابقة للاسم واللقب ب أحرف اللاتينية</div>
    <div class="row" style="margin-top: 6px;">
      <span class="dots" style="flex: 1;"></span>
    </div>
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
