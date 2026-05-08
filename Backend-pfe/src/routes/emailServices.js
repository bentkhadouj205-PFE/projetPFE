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
    
    // Fallback: fetch full record from actes_naissance if needed
    if (!actes_naissance.pere_nom_prenom && (actes_naissance.citizen_id || actes_naissance.citizen_nin)) {
      const { data: fullRecord } = await supabase
        .schema('register')
        .from('actes_naissance')
        .select('*')
        .or(`citizen_id.eq.${actes_naissance.citizen_id},numero_chahada.eq.${actes_naissance.actNumber}`)
        .maybeSingle();
      if (fullRecord) {
        actes_naissance = { ...fullRecord, ...actes_naissance };
      }
    }
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

  // FIX 1: Use single backslash \u so the unicode range actually works
  const dType = rawType.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  console.log(' [PDF Gen] Normalized type:', dType);

  const isResidenceCard = dType.includes('residence') || dType.includes('sejour') || dType.includes('carte');
  console.log(' [PDF Gen] isResidenceCard:', isResidenceCard);

  // FIX 2: Declare html with let at top level so both branches can assign to it
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
      numeroChahada: actes_naissance.numero_chahada ?? actes_naissance.numeroChahada ?? actes_naissance.numero_acte ?? '///',
      dateNaissance: actes_naissance.date_naissance ?? actes_naissance.dateNaissance,
      heureNaissance: actes_naissance.heure_naissance ?? actes_naissance.heureNaissance,
      communeNaissance: actes_naissance.commune_naissance ?? actes_naissance.communeNaissance ?? actes_naissance.commune,
      wilayaNaissance: actes_naissance.wilaya_naissance ?? actes_naissance.wilayaNaissance ?? actes_naissance.wilaya,
      fullName: actes_naissance.nom_prenom ?? actes_naissance.full_name ?? actes_naissance.fullName ?? `${actes_naissance.prenom || ''} ${actes_naissance.nom || ''}`.trim(),
      genre: actes_naissance.genre ?? actes_naissance.sexe,
      pereNomPrenom: actes_naissance.pere_nom_prenom ?? actes_naissance.pereNomPrenom,
      pereAge: actes_naissance.pere_age ?? actes_naissance.pereAge,
      pereMetier: actes_naissance.pere_metier ?? actes_naissance.pereMetier ?? actes_naissance.pereProfession,
      mereNomPrenom: actes_naissance.mere_nom_prenom ?? actes_naissance.mereNomPrenom,
      mereAge: actes_naissance.mere_age ?? actes_naissance.mereAge,
      mereMetier: actes_naissance.mere_metier ?? actes_naissance.mereMetier ?? actes_naissance.mereProfession,
      domicileCommune: actes_naissance.domicile_commune ?? actes_naissance.domicileCommune ?? actes_naissance.commune,
      domicileWilaya: actes_naissance.domicile_wilaya ?? actes_naissance.domicileWilaya ?? actes_naissance.wilaya,
      heureRedaction: actes_naissance.heure_redaction ?? actes_naissance.heureRedaction,
      declarePar: actes_naissance.declare_par ?? actes_naissance.declarePar,
      officierEtatCivil: actes_naissance.officier_etat_civil ?? actes_naissance.officierEtatCivil,
      marginalNotes: actes_naissance.marginal_notes ?? actes_naissance.marginalNotes,
      fullNameLatin: actes_naissance.full_name_latin ?? actes_naissance.fullNameLatin,
    };

    // FIX 2: assign to outer `html` (no `const` here)
    html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat de Naissance - Version Électronique</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Times+New+Roman&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #c8c8c8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 30px 20px;
      font-family: 'Times New Roman', Times, serif;
    }

    .page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm 14mm 16mm;
      box-shadow: 0 2px 20px rgba(0,0,0,0.3);
      position: relative;
      color: #000;
    }

    .outer-border {
      position: absolute;
      top: 6px; left: 6px; right: 6px; bottom: 6px;
      border: 2.5px solid #000;
      pointer-events: none;
    }
    .inner-border {
      position: absolute;
      top: 11px; left: 11px; right: 11px; bottom: 11px;
      border: 1px solid #000;
      pointer-events: none;
    }

    .header {
      text-align: center;
      margin-bottom: 4px;
    }
    .header .republic {
      font-size: 15pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      line-height: 1.5;
    }
    .header .ministry {
      font-size: 12pt;
      font-weight: bold;
      line-height: 1.5;
    }
    .header .registry {
      font-size: 11pt;
      line-height: 1.5;
    }

    hr.thick { border: none; border-top: 2px solid #000; margin: 6px 0; }
    hr.thin  { border: none; border-top: 1px solid #000; margin: 4px 0; }

    .main-title {
      text-align: center;
      font-size: 28pt;
      font-weight: bold;
      letter-spacing: 1px;
      line-height: 1.3;
      margin: 4px 0 2px;
    }
    .sub-title {
      text-align: center;
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 8px;
    }

    .field-block {
      margin-top: 4px;
    }

    .row {
      display: flex;
      align-items: flex-end;
      min-height: 26px;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      padding-bottom: 2px;
      gap: 4px;
      font-size: 11pt;
    }
    .row.no-line { border-bottom: none; }

    .lbl {
      white-space: nowrap;
      font-weight: normal;
      font-size: 11pt;
      line-height: 1;
    }
    .lbl.bold { font-weight: bold; }

    .dots {
      flex: 1;
      border-bottom: 1px dotted #666;
      min-height: 16px;
      margin-bottom: -1px;
    }
    .dots.short { max-width: 90px; flex: none; width: 90px; }
    .dots.med   { max-width: 160px; flex: none; width: 160px; }

    .top-meta {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11pt;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .cert-num {
      font-size: 10pt;
      white-space: nowrap;
    }
    .cert-num span {
      display: inline-block;
      min-width: 60px;
      border-bottom: 1px dotted #666;
    }

    .margin-section {
      margin-top: 10px;
    }
    .margin-title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .blank-line {
      border-bottom: 1px solid #000;
      min-height: 20px;
      margin-bottom: 4px;
      width: 100%;
    }

    .footer-drafted {
      font-size: 11pt;
      margin-top: 12px;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }

    .latin-section {
      margin-top: 10px;
      border-top: 1.5px solid #000;
      padding-top: 8px;
    }
    .latin-title {
      font-size: 10.5pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 6px;
    }
    .latin-row {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 10.5pt;
    }
    .latin-row .dots { border-bottom: 1px solid #666; }

    .official-box {
      text-align: center;
      border: 2px solid #000;
      padding: 5px 14px;
      font-size: 11pt;
      font-weight: bold;
      display: inline-block;
      margin-top: 8px;
    }
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 10px;
    }
    .stamp-circle {
      width: 75px;
      height: 75px;
      border: 1.5px dashed #000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #555;
    }
    .ref {
      font-size: 9pt;
      align-self: flex-end;
    }

    .value {
      font-weight: bold;
      font-size: 11pt;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="outer-border"></div>
  <div class="inner-border"></div>

  <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
    <div style="text-align: left;">
      <div class="republic">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>
      <div class="ministry">Ministère de l'Intérieur et des Collectivités Locales</div>
      <div class="registry">Registre National de l'État Civil</div>
    </div>
    <div style="text-align: right; font-family: 'Arial', sans-serif; direction: rtl;">
      <div style="font-size: 15pt; font-weight: bold;">الجمهورية الجزائرية الديمقراطية الشعبية</div>
      <div style="font-size: 12pt; font-weight: bold;">وزارة الداخلية والجماعات المحلية</div>
      <div style="font-size: 11pt;">السجل الوطني للحالة المدنية</div>
    </div>
  </div>

  <hr class="thick">

  <div class="main-title" style="display: flex; justify-content: center; align-items: center; gap: 40px;">
    <span>CERTIFICAT DE NAISSANCE</span>
    <span style="font-family: 'Arial', sans-serif;">شهادة الميلاد</span>
  </div>
  <div class="sub-title" style="display: flex; justify-content: center; gap: 20px;">
    <span>Version électronique</span>
    <span>نسخة إلكترونية</span>
  </div>

  <hr class="thin">

  <div class="top-meta">
    <div class="cert-num">
      N° de l'acte&nbsp;&nbsp;<span class="value">${v(d.numeroChahada)}</span>
    </div>
    <div style="flex:1; display:flex; align-items:flex-end; gap:4px; padding-left:20px;">
      <span class="lbl">Le jour</span>
      <div class="dots"><span class="value">${formatDate(d.dateNaissance)}</span></div>
    </div>
  </div>

  <div class="field-block">

    <div class="row">
      <span class="lbl">à l'heure de</span>
      <div class="dots med"><span class="value">${formatTime(d.heureNaissance)}</span></div>
      <span class="lbl">est né(e) à</span>
      <div class="dots"><span class="value">${v(d.communeNaissance)}</span></div>
    </div>

    <div class="row">
      <span class="lbl">commune de</span>
      <div class="dots"><span class="value">${v(d.communeNaissance)}</span></div>
      <span class="lbl">wilaya de</span>
      <div class="dots med"><span class="value">${v(d.wilayaNaissance)}</span></div>
    </div>

    <div class="row">
      <span class="lbl" style="font-family:monospace; font-size:10.5pt;">${formatDate(d.dateNaissance)}</span>
      <div class="dots short"></div>
      <span class="lbl">dénommé(e)</span>
      <div class="dots"><span class="value">${v(d.fullName)}</span></div>
    </div>

    <div class="row">
      <span class="lbl">sexe</span>
      <div class="dots"><span class="value">${v(d.genre)}</span></div>
    </div>

    <div class="row">
      <span class="lbl">fils / fille de</span>
      <div class="dots"><span class="value">${v(d.pereNomPrenom)}</span></div>
      <span class="lbl">âge</span>
      <div class="dots short"><span class="value">${v(d.pereAge, '///')}</span></div>
      <span class="lbl">profession</span>
      <div class="dots med"><span class="value">${v(d.pereMetier, '///')}</span></div>
    </div>

    <div class="row">
      <span class="lbl">et de</span>
      <div class="dots"><span class="value">${v(d.mereNomPrenom)}</span></div>
      <span class="lbl">âge</span>
      <div class="dots short"><span class="value">${v(d.mereAge, '///')}</span></div>
      <span class="lbl">profession</span>
      <div class="dots med"><span class="value">${v(d.mereMetier, '///')}</span></div>
    </div>

    <div class="row">
      <span class="lbl">demeurant à</span>
      <div class="dots"><span class="value">${v(d.domicileCommune)}</span></div>
      <span class="lbl">commune</span>
      <div class="dots med"><span class="value">${v(d.domicileCommune)}</span></div>
      <span class="lbl">wilaya</span>
      <div class="dots short"><span class="value">${v(d.domicileWilaya, '///')}</span></div>
    </div>

    <div class="row">
      <span class="lbl">Dressé à</span>
      <div class="dots"><span class="value">${v(d.communeNaissance)}</span></div>
      <span class="lbl">à l'heure de</span>
      <div class="dots med"><span class="value">${v(d.heureRedaction)}</span></div>
    </div>

    <div class="row">
      <span class="lbl">sur déclaration de M./Mme</span>
      <div class="dots"><span class="value">${v(d.declarePar)}</span></div>
    </div>

    <div class="row">
      <div class="dots" style="max-width:100%; width:100%;"></div>
    </div>

    <div class="row" style="flex-wrap:wrap; gap:4px;">
      <span class="lbl">Après lecture, signé avec nous</span>
      <div class="dots"><span class="value">${v(d.officierEtatCivil)}</span></div>
      <span class="lbl" style="white-space:nowrap;">Officier de l'État Civil de la commune de</span>
      <div class="dots" style="max-width:200px; width:150px;"><span class="value">${v(d.communeNaissance)}</span></div>
    </div>

  </div>

  <div class="margin-section">
    <div class="margin-title">Mentions marginales</div>
    <div class="blank-line"><span class="value">${v(d.marginalNotes)}</span></div>
    <div class="blank-line"></div>
    <div class="blank-line"></div>
    <div class="blank-line"></div>
    <div class="blank-line"></div>
    <div class="blank-line"></div>
  </div>

  <div class="footer-drafted">
    Dressé à <strong>${v(d.communeNaissance, 'Mostaganem')}</strong> le <strong>${today}</strong>
  </div>

  <div class="latin-section">
    <div class="latin-title">Transcription antérieure du nom et prénom en caractères latins</div>

    <div class="latin-row">
      <span>1- En toutes lettres</span>
      <div class="dots"><span class="value">${v(d.fullNameLatin)}</span></div>
    </div>
    <div class="latin-row">
      <span>2- Nom et prénom de l'enfant</span>
      <div class="dots"><span class="value">${v(d.fullNameLatin)}</span></div>
    </div>

    <div style="text-align:center; margin-top:10px; display: flex; flex-direction: column; align-items: center; gap: 5px;">
      <span class="official-box">CERTIFICAT DU REGISTRE NATIONAL DE L'ÉTAT CIVIL</span>
      <span style="font-family: 'Arial', sans-serif; font-size: 11pt; font-weight: bold; border: 2px solid #000; padding: 5px 14px;">مستخرج من السجل الوطني للحالة المدنية</span>
    </div>

    <div class="bottom-row">
      <div class="stamp-circle">Cachet</div>
      <div class="ref">Réf. J.M. 7</div>
    </div>
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
      subject: `Votre document est prêt - ${requestSubject || 'Certificat de Naissance'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right">
          <div style="background:#00782B;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
            <p style="color:#c8f5d8;margin:4px 0 0">Service d'état civil en ligne</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>،</p>
            <p>Votre demande a été acceptée par nos services <span style="color:#00782B;font-weight:bold">${requestSubject || 'Certificat de Naissance'}</span>.</p>
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
          : 'Certificat_de_Naissance.pdf',
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