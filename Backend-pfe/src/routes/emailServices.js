import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { supabase } from '../supabaseClient.js';
import nodemailer from 'nodemailer';

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

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  
  const execPath = await chromium.executablePath();
  browserInstance = await puppeteer.launch({
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
  return browserInstance;
}

export async function generateCertificatePDF(input) {
  let data;
  if (typeof input === 'string') {
    data = await fetchActeNaissance(input);
  } else {
    data = input || {};
    if (!data.pere_nom_prenom && (data.citizen_id || data.citizen_nin)) {
      const { data: fullRecord } = await supabase
        .schema('register')
        .from('actes_naissance')
        .select('*')
        .or(`citizen_id.eq.${data.citizen_id},numero_chahada.eq.${data.actNumber}`)
        .maybeSingle();
      if (fullRecord) {
        data = { ...fullRecord, ...data };
      }
    }
  }

  const v = (val, fallback = '') => (val ? String(val) : fallback);
  const formatDate = (d) => {
    if (!d) return '../../..';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const rawType = data.subject || data.type_document || data.requestSubject || '';
  const dType = rawType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isResidenceCard = dType.includes('residence') || dType.includes('sejour') || dType.includes('carte');

  let html = '';
  if (isResidenceCard) {
    const d = {
      fullName: data.fullName || data.nom_prenom || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      dateNaissance: data.date_naissance || data.dateNaissance || '',
      lieuNaissance: data.lieu_naissance || data.lieuNaissance || data.commune_naissance || '',
      adresse: data.adresse || data.citizen_address || '',
      wilaya: data.wilaya || data.domicile_wilaya || 'Mostaganem',
      daira: data.daira || data.domicile_daira || 'Mostaganem',
      commune: data.commune || data.domicile_commune || 'Mostaganem',
      presidentName: data.president_name || data.presidentName || 'Ould Abed Meshri',
    };

    html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Certificat de Résidence</title>
    <style>
        body {font-family: "Times New Roman", Times, serif;background-color: white;color: black;margin: 0;padding: 10px;line-height: 1.8;}
        .container {max-width: 800px;margin: auto;border: 1.5px solid black;padding: 40px;position: relative; min-height: 1050px; box-sizing: border-box;}
        .header {text-align: center;margin-bottom: 40px;font-weight: bold;text-transform: uppercase;}
        .header h1 {font-size: 20px;margin: 5px 0;}
        .header h2 {font-size: 18px;margin: 3px 0;}
        .header-left {text-align: left;font-weight: normal;text-transform: uppercase;margin-bottom: 30px;}
        .header-left h2 {font-size: 15px;margin: 5px 0;font-weight: normal;}
        .title-box {text-align: center;margin: 40px auto;border: 2px solid black;border-radius: 12px;padding: 20px 50px;display: table;}
        .title-box h3 {font-size: 32px;margin: 0;text-transform: uppercase;letter-spacing: 3px;}
        .content-section {margin-top: 30px; font-size: 18px;}
        .row {margin-bottom: 25px;display: flex;align-items: baseline;}
        .label {font-weight: normal;margin-right: 10px;white-space: nowrap;}
        .dots {flex-grow: 1;border-bottom: 0.5px dotted #888;height: 22px;padding-left: 10px;}
        .grid-row {display: grid;grid-template-columns: 1fr 1fr;gap: 30px;}
        .footer {margin-top: 60px;display: flex;justify-content: space-between; font-size: 18px;}
        .validity-note {position: absolute; bottom: 20px; left: 40px; right: 40px; font-size: 14px; font-style: italic; border-top: 1px solid black; padding-top: 10px;}
        .dynamic-val { font-family: Arial, sans-serif;font-weight: normal;}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>République Algérienne Démocratique et Populaire</h1>
        <h2>Ministère de l'Intérieur</h2>
    </div>
    <div class="header-left">
        <h2>Wilaya de : <span class="dynamic-val">${v(d.wilaya)}</span></h2>
        <h2>Daïra de : <span class="dynamic-val">${v(d.daira)}</span></h2>
        <h2>Commune de : <span class="dynamic-val">${v(d.commune)}</span></h2>
    </div>
    <div class="title-box">
        <h3>Certificat de Résidence</h3>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 18px; line-height: 1.5;">
        Nous,<br>
        <strong>${v(d.presidentName)}</strong><br>
        <strong>${v(d.commune)}</strong>
    </div>
    <div class="content-section">
        <div class="row"><span class="label">M. / Mme / Mlle :</span><span class="dots dynamic-val">${v(d.fullName)}</span></div>
        <div class="row">
            <span class="label">Né(e) le :</span><span class="dots dynamic-val">${v(d.dateNaissance)}</span>
            <span class="label" style="margin-left: 10px;">à :</span><span class="dots dynamic-val">${v(d.lieuNaissance)}</span>
        </div>
        <div class="row"><span class="label">Demeurant à :</span><span class="dots dynamic-val">${v(d.commune)}</span></div>
        <div class="row"><span class="label">Adresse complète :</span><span class="dots dynamic-val">${v(d.adresse)}</span></div>
        <p style="margin-top: 20px;">Réside dans la commune depuis plus de six (06) mois.</p>
        <p>Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
    </div>
    <div class="footer">
        <div>Fait à : <strong>${v(d.commune)}</strong><br>Le : <span class="dynamic-val">${formatDate(new Date())}</span></div>
    </div>
    <div class="validity-note">(1) La validité de la présente attestation ne peut excéder six (6) mois</div>
</div>
</body>
</html>`;
  } else {
    const d = {
      numeroActe: data.numero_acte || data.numeroChahada || '',
      dateNaissance: data.date_naissance || '',
      heureNaissance: data.heure_naissance || '',
      communeNaissance: data.commune_naissance || '',
      wilayaNaissance: data.wilaya_naissance || '',
      fullName: data.nom_prenom_enfant || data.fullName || '',
      genre: data.genre_enfant || data.sexe || '',
      pereNomPrenom: data.nom_prenom_pere || '',
      mereNomPrenom: data.nom_prenom_mere || '',
      domicileCommune: data.domicile_commune || '',
      dateRedaction: data.date_redaction || data.dateDelivrance || '',
      heureRedaction: data.heure_redaction || '',
      declarePar: data.declare_par || '',
      officierEtatCivil: data.officier_etat_civil || '',
    };

    html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Certificat de Naissance</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; background: #fff; color: #000; line-height: 1.4; }
        .container { border: 2px solid #000; padding: 30px; position: relative; max-width: 800px; margin: auto; min-height: 1050px; box-sizing: border-box; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 5px 0; text-transform: uppercase; }
        .header h2 { font-size: 16px; margin: 5px 0; }
        .title-box { text-align: center; margin: 20px 0; padding: 10px 0; }
        .title-box h3 { font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
        .content-section { margin-top: 15px; }
        .row { margin-bottom: 10px; display: flex; align-items: baseline; }
        .label { font-weight: normal; margin-right: 10px; white-space: nowrap; }
        .dots { flex-grow: 1; border-bottom: 0.5px dotted #888; height: 14px; padding-left: 10px; }
        .grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .dynamic-val { font-family: Arial, sans-serif; font-weight: normal; }
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
        <p style="text-align: left; font-size: 11px; font-style: italic; color: #555; margin: 0 0 0 10px; font-weight: normal;">Copie Électronique</p>
    </div>
    <div style="text-align: center; margin: 20px 0;"><h2 style="font-size: 28px; font-weight: bold; text-transform: uppercase; margin: 0;">Certifie que</h2></div>
    <div class="content-section">
        <div class="row"><span class="label">Acte N° :</span><span class="dots dynamic-val">${v(d.numeroActe)}</span></div>
        <div class="row">
            <span class="label">Le jour du :</span><span class="dots dynamic-val">${v(d.dateNaissance)}</span>
            <span class="label" style="margin-left: 10px;">à :</span><span class="dots dynamic-val">${v(d.heureNaissance)}</span>
            <span class="label" style="margin-left: 5px;">heures</span>
        </div>
        <div class="row"><span class="label">Est né(e) à :</span><span class="dots dynamic-val">${v(d.communeNaissance)}</span></div>
        <div class="grid-row">
            <div class="row"><span class="label">Commune :</span><span class="dots dynamic-val">${v(d.communeNaissance)}</span></div>
            <div class="row"><span class="label">Wilaya :</span><span class="dots dynamic-val">${v(d.wilayaNaissance)}</span></div>
        </div>
        <div class="row"><span class="label">Dénommé(e) :</span><span class="dots dynamic-val">${v(d.fullName)}</span></div>
        <div class="row"><span class="label">Sexe :</span><span class="dots dynamic-val">${v(d.genre)}</span></div>
        <div class="row"><span class="label">Fils / Fille de :</span><span class="dots dynamic-val">${v(d.pereNomPrenom)}</span></div>
        <div class="row"><span class="label">Et de :</span><span class="dots dynamic-val">${v(d.mereNomPrenom)}</span></div>
        <div class="row" style="margin-top: 20px; display: block;">
            <p style="margin: 0; line-height: 1.8;">
                Dressé le <span style="display:inline-block; min-width:100px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.dateRedaction)}</span> 
                à <span style="display:inline-block; min-width:60px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.heureRedaction)}</span> heures, 
                sur la déclaration de : <span style="display:inline-block; min-width:200px; border-bottom: 1px dotted black;" class="dynamic-val">${v(d.declarePar)}</span>
            </p>
        </div>
        <div class="row" style="margin-top: 15px; display: flex; align-items: baseline;">
            <span class="label">Le Président de l'Assemblée Populaire Communale de la commune de :</span>
            <span class="dots dynamic-val" style="flex-grow: 1;">${v(d.domicileCommune)}</span>
        </div>
        <div style="margin-top: 20px;"><p style="font-weight: bold; margin-bottom: 10px;">Mentions marginales</p><div style="border-top: 1px solid black; margin-bottom: 15px;"></div><div style="border-top: 1px solid black; margin-bottom: 15px;"></div></div>
        <div style="position: absolute; bottom: 15px; left: 15px; font-size: 10px; text-align: left; font-weight: normal; text-transform: none; line-height: 1.2; color: #333;">Extrait du Registre National de l'État Civil<br>Référence : 7 M.G.</div>
    </div>
</div>
</body>
</html>`;
  }

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await page.close();
    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    throw err;
  }
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

// ── Email sender ─────────────────────────────────────────────────────────────
export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBufferOrId) {
    let pdfBuffer;
    if (Buffer.isBuffer(pdfBufferOrId)) {
      pdfBuffer = pdfBufferOrId;
    } else {
      pdfBuffer = await generateCertificatePDF(pdfBufferOrId);
    }

    const htmlContent = `
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
    `;

    const isResidence = (requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence')));
    const attachmentName = isResidence ? 'Fiche_de_Residence.pdf' : 'Certificat_de_Naissance.pdf';

    const mailOptions = {
      from: `"Baladiya Digital" <${process.env.SMTP_USER}>`,
      to: citizenEmail,
      subject: `Votre document est prêt - ${requestSubject || 'Certificat de Naissance'}`,
      html: htmlContent,
      attachments: [{
        filename: attachmentName,
        content: pdfBuffer,
      }],
    };

    const currentTransporter = getTransporter();
    const info = await currentTransporter.sendMail(mailOptions);
    console.log(' [Nodemailer Success]:', info.messageId);
    return { messageId: info.messageId };
  }
};