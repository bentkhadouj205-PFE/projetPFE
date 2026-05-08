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
    // ─── RESIDENCE CARD TEMPLATE  ─────────────────────────────
    const d = {
      fullName: actes_naissance.fullName || actes_naissance.nom_prenom || `${actes_naissance.firstName || ''} ${actes_naissance.lastName || ''}`.trim(),
      dateNaissance: actes_naissance.date_naissance || actes_naissance.dateNaissance || '',
      lieuNaissance: actes_naissance.lieu_naissance || actes_naissance.lieuNaissance || actes_naissance.commune_naissance || '',
      adresse: actes_naissance.adresse || actes_naissance.citizen_address || '',
      wilaya: actes_naissance.wilaya || actes_naissance.domicile_wilaya || 'Mostaganem',
      daira: actes_naissance.daira || actes_naissance.domicile_daira || 'Mostaganem',
      commune: actes_naissance.commune || actes_naissance.domicile_commune || 'Mostaganem',
      nationalite: actes_naissance.nationalite || 'Algerian',
      profession: actes_naissance.profession || actes_naissance.metier || '',
      presidentName: actes_naissance.president_name || actes_naissance.presidentName || 'Ould abed CHri',
    };

    html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificat de Résidence</title>
    <style>
        body {font-family: "Times New Roman", Times, serif;background-color: white;color: black;margin: 0;padding: 40px;line-height: 1.6;}
        .container {max-width: 800px;margin: auto;border: 2px solid black;padding: 40px;position: relative;}
        .header {text-align: center;margin-bottom: 30px;font-weight: bold;text-transform: uppercase;}
        .header h1 {font-size: 18px;margin: 5px 0;}
        .header h2 {font-size: 16px;margin: 3px 0;}
        .title-box {text-align: center;margin: 20px 0;border-top: 1px solid black;border-bottom: 1px solid black;padding: 10px 0;}
        .title-box h3 {font-size: 24px;margin: 0;text-transform: uppercase;letter-spacing: 2px;}
        .content-section {margin-top: 30px;}
        .row {margin-bottom: 15px;display: flex;align-items: baseline;}
        .label {font-weight: bold;margin-right: 10px;white-space: nowrap;}
        .dots {flex-grow: 1;border-bottom: 1px dotted black;height: 14px;padding-left: 10px;}
        .grid-row {display: grid;grid-template-columns: 1fr 1fr;gap: 20px;}
        .footer {margin-top: 50px;display: flex;justify-content: space-between;}
        .validity-note {margin-top: 30px;font-size: 12px;font-style: italic;border-top: 1px solid black;padding-top: 10px;}
        .dynamic-val { font-family: Arial, sans-serif;font-weight: normal;}
        @media print {body {padding: 0;}.container {border: none;}}
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>République Algérienne Démocratique et Populaire</h1>
        <h2>Ministère de l'Intérieur</h2>
        <h2>Wilaya de : <span class="dynamic-val">${v(d.domicileWilaya)}</span></h2>
        <h2>Daïra de : <span class="dynamic-val">${v(d.domicileDaira || 'Mostaganem')}</span></h2>
        <h2>Commune de : <span class="dynamic-val">${v(d.domicileCommune)}</span></h2>
    </div>

    <div class="title-box">
        <h3>Certificat de Résidence</h3>
    </div>

    <div class="content-section">
        <p>Le Président de l'Assemblée Populaire Communale de la commune de <span class="dynamic-val"><strong>${v(d.domicileCommune)}</strong></span>, certifie que :</p>
        
        <div class="row">
            <span class="label">M. / Mme / Mlle :</span>
            <span class="dots dynamic-val">${v(d.fullName)}</span>
        </div>

        <div class="row">
            <span class="label">Né(e) le :</span>
            <span class="dots dynamic-val">${v(d.dateNaissance)}</span>
            <span class="label" style="margin-left: 10px;">à :</span>
            <span class="dots dynamic-val">${v(d.communeNaissance)}</span>
        </div>

        <div class="grid-row">
            <div class="row">
                <span class="label">Profession :</span>
                <span class="dots dynamic-val">${v(d.pereMetier || '///')}</span>
            </div>
            <div class="row">
                <span class="label">Nationalité :</span>
                <span class="dots dynamic-val">Algérienne</span>
            </div>
        </div>

        <div class="row">
            <span class="label">Demeurant à :</span>
            <span class="dots dynamic-val">${v(d.domicileCommune)}</span>
        </div>

        <div class="row">
            <span class="label">Adresse complète :</span>
            <span class="dots dynamic-val">${v(d.adresseComplete || '///')}</span>
        </div>

        <p style="margin-top: 20px;">Réside dans la commune depuis plus de six (06) mois.</p>
        
        <p>Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit dans les limites de ce qui n'est pas interdit par la loi.</p>
    </div>

    <div class="footer">
        <div>
            Fait à : <strong>${v(d.domicileCommune)}</strong><br>
            Le : <span style="display:inline-block; width:120px; border-bottom: 1px dotted black;" class="dynamic-val">${v(new Date().toLocaleDateString())}</span>
        </div>
        <div style="text-align: center;">
            Sceau et Signature de l'Officier
        </div>
    </div>

    <div class="validity-note">
        (1) La durée de validité de ce certificat ne peut excéder six (06) mois à compter de sa date de délivrance.
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

    html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificat de Naissance</title>
    <style>
        body {font-family: "Times New Roman", Times, serif;background-color: white;color: black;margin: 0;padding: 40px;line-height: 1.6;}
        .container {max-width: 800px;margin: auto;border: 2px solid black;padding: 40px;position: relative;}
        .header {text-align: center;margin-bottom: 30px;font-weight: bold;text-transform: uppercase;}
        .header h1 {font-size: 18px;margin: 5px 0;}
        .header h2 {font-size: 16px;margin: 5px 0;}
        .title-box {text-align: center;margin: 20px 0;border-top: 1px solid black;border-bottom: 1px solid black;padding: 10px 0;}
        .title-box h3 {font-size: 24px;margin: 0;text-transform: uppercase;letter-spacing: 2px;}
        .title-box p {margin: 5px 0 0 0;font-style: italic;}
        .content-section {margin-top: 20px;}
        .row {margin-bottom: 15px;display: flex;align-items: baseline;}
        .label {font-weight: bold;margin-right: 10px;white-space: nowrap;}
        .dots {flex-grow: 1;border-bottom: 1px dotted black;height: 14px;padding-left: 10px;}
        .grid-row {display: grid;grid-template-columns: 1fr 1fr;gap: 20px;}
        .marginal-notes {margin-top: 40px;border: 1px solid black;min-height: 100px;padding: 10px;}
        .marginal-notes-title {font-weight: bold;text-decoration: underline;margin-bottom: 10px;}
        .footer {margin-top: 40px;display: flex;justify-content: space-between;}
        .latin-spelling {margin-top: 30px;border-top: 1px solid black;padding-top: 10px;font-size: 14px;}
        .reference {text-align: right;font-size: 12px;margin-top: 20px;}
        .dynamic-val {font-family: Arial, sans-serif;font-weight: normal;}
        @media print {body { padding: 0; }.container { border: none; }}
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>République Algérienne Démocratique et Populaire</h1>
        <h2>Ministère de l'Intérieur et des Collectivités Locales</h2>
        <h2>Registre National de l'État Civil</h2>
    </div>

    <div class="title-box">
        <h3>Certificat de Naissance</h3>
        <p>Copie Électronique</p>
    </div>

    <div class="content-section">
        <div class="row">
            <span class="label">Acte N° :</span>
            <span class="dots dynamic-val">${v(d.numeroChahada)}</span>
        </div>

        <div class="row">
            <span class="label">Le jour du :</span>
            <span class="dots dynamic-val">${v(d.dateNaissance)}</span>
            <span class="label" style="margin-left: 10px;">à :</span>
            <span class="dots dynamic-val">${v(d.heureNaissance)}</span>
            <span class="label" style="margin-left: 5px;">heures</span>
        </div>

        <div class="row">
            <span class="label">Est né(e) à :</span>
            <span class="dots dynamic-val">${v(d.communeNaissance)}</span>
        </div>

        <div class="grid-row">
            <div class="row">
                <span class="label">Commune :</span>
                <span class="dots dynamic-val">${v(d.communeNaissance)}</span>
            </div>
            <div class="row">
                <span class="label">Wilaya :</span>
                <span class="dots dynamic-val">${v(d.wilayaNaissance)}</span>
            </div>
        </div>

        <div class="row">
            <span class="label">Le :</span>
            <span class="dots dynamic-val">${v(d.dateNaissance)}</span>
        </div>

        <div class="row">
            <span class="label">Nom et Prénom :</span>
            <span class="dots dynamic-val">${v(d.fullName)}</span>
        </div>

        <div class="row">
            <span class="label">Sexe :</span>
            <span class="dots dynamic-val">${v(d.genre)}</span>
        </div>

        <div class="row">
            <span class="label">Fils / Fille de :</span>
            <span class="dots dynamic-val">${v(d.pereNomPrenom)}</span>
        </div>

        <div class="grid-row">
            <div class="row">
                <span class="label">Âge :</span>
                <span class="dots dynamic-val">${v(d.pereAge)}</span>
            </div>
            <div class="row">
                <span class="label">Profession :</span>
                <span class="dots dynamic-val">${v(d.pereMetier)}</span>
            </div>
        </div>

        <div class="row">
            <span class="label">Et de :</span>
            <span class="dots dynamic-val">${v(d.mereNomPrenom)}</span>
        </div>

        <div class="grid-row">
            <div class="row">
                <span class="label">Âge :</span>
                <span class="dots dynamic-val">${v(d.mereAge)}</span>
            </div>
            <div class="row">
                <span class="label">Profession :</span>
                <span class="dots dynamic-val">${v(d.mereMetier)}</span>
            </div>
        </div>

        <div class="row">
            <span class="label">Domiciliés à :</span>
            <span class="dots dynamic-val">${v(d.domicileCommune)}</span>
        </div>

        <div class="grid-row">
            <div class="row">
                <span class="label">Commune :</span>
                <span class="dots dynamic-val">${v(d.domicileCommune)}</span>
            </div>
            <div class="row">
                <span class="label">Wilaya :</span>
                <span class="dots dynamic-val">${v(d.domicileWilaya)}</span>
            </div>
        </div>

        <div class="row" style="margin-top: 20px;">
            <p style="margin: 0;">Dressé le <span style="display:inline-block; width:100px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.dateNaissance)}</span> à <span style="display:inline-block; width:60px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.heureRedaction)}</span> heures, sur la déclaration de :</p>
        </div>
        <div class="row">
            <span class="dots dynamic-val">${v(d.declarePar)}</span>
        </div>

        <div class="row" style="margin-top: 10px;">
            <p style="margin: 0;">Lequel, après lecture, a signé avec nous :</p>
        </div>

        <div class="row">
            <span class="label">Nous,</span>
            <span class="dots dynamic-val">${v(d.officierEtatCivil)}</span>
            <span class="label" style="margin-left: 10px;">Officier de l'État Civil de la commune de :</span>
        </div>
        <div class="row">
            <span class="dots dynamic-val">${v(d.domicileCommune)}</span>
        </div>
    </div>

    <div class="marginal-notes">
        <div class="marginal-notes-title">Mentions Marginales :</div>
        <div class="dynamic-val">${v(d.marginalNotes)}</div>
    </div>

    <div class="footer">
        <div>
            Fait à : <strong>${v(d.domicileCommune)}</strong><br>
            Le : <span style="display:inline-block; width:120px; border-bottom: 1px dotted black;" class="dynamic-val">${v(new Date().toLocaleDateString())}</span>
        </div>
        <div style="text-align: center;">
            Sceau et Signature
        </div>
    </div>

    <div class="latin-spelling">
        <strong>Transcription du Nom et Prénom en caractères latins :</strong><br>
        1- En toutes lettres : <span style="display:inline-block; width:400px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.fullNameLatin)}</span><br>
        2- Nom et Prénom de l'enfant : <span style="display:inline-block; width:350px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.fullNameLatin)}</span>
    </div>

    <div class="reference">
        Extrait du Registre National de l'État Civil<br>
        Référence : 7 M.G.
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
      subject: `Votre document est prêt - ${requestSubject || 'Certificat de Naissance'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:ltr;text-align:left">
          <div style="background:#00782B;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
            <p style="color:#c8f5d8;margin:4px 0 0">Service d'état civil en ligne</p>
          </div>
          <div style="padding:24px">
            <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
            <p>Votre demande a été acceptée par nos services : <span style="color:#00782B;font-weight:bold">${requestSubject || 'Certificat de Naissance'}</span>.</p>
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