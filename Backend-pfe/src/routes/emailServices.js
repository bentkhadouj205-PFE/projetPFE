import { supabase } from '../supabaseClient.js';
import PDFService from '../server/pdfservice.js';

export async function initializeEmail() {
  console.log('Email Service ready (Brevo API only)');
  return true;
}

export async function fetchActeNaissance(requestId) {
  const { data, error } = await supabase
    .schema('register')
    .from('actes_naissance')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    throw new Error(`Could not fetch acte_naissance id=${requestId}: ${error.message}`);
  }
  return data;
}

export async function generateCertificatePDF(input) {
  let data;
  if (typeof input === 'string') {
    data = await fetchActeNaissance(input);
  } else {
    data = input || {};
    if (!data.nom_prenom_pere && (data.citizen_id || data.citizen_nin)) {
      const { data: fullRecord } = await supabase
        .schema('register')
        .from('actes_naissance')
        .select('*')
        .or(`citizen_id.eq.${data.citizen_id || null},numero_acte.eq.${data.actNumber || data.numeroActe || data.numero_acte || null}`)
        .maybeSingle();
      if (fullRecord) data = { ...fullRecord, ...data };
    }
  }

  const rawType = data.subject || data.type_document || data.requestSubject || '';
  const dType = rawType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isResidenceCard = dType.includes('residence') || dType.includes('sejour') || dType.includes('carte');
  const isVoirie = dType.includes('voirie') || dType.includes('road');

  console.log(`[PDF] Type: "${rawType}" → ${isResidenceCard ? 'Résidence' : isVoirie ? 'Voirie' : 'Naissance'}`);

  if (isResidenceCard) return await PDFService.generateCarteSejour(data);
  if (isVoirie) return await PDFService.generateOrdreVersement(data);
  return await PDFService.generateActeNaissance(data);
}

// ── Single Brevo sender ────────────────────────────────────────────────────
async function sendViaBrevo({ to, toName, subject, htmlContent, pdfBuffer, pdfName }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_USER || 'baladiyadigital27@gmail.com';

  const payload = {
    sender: { name: 'Baladiya Digital', email: senderEmail },
    to: [{ email: to, name: toName || 'Citoyen' }],
    subject,
    htmlContent,
    ...(pdfBuffer && {
      attachment: [{
        name: pdfName || 'document.pdf',
        content: pdfBuffer.toString('base64'),
        type: 'application/pdf',
      }]
    }),
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Brevo API error: ${response.status}`);

  console.log('[Brevo] Sent successfully. messageId:', result.messageId);
  return { messageId: result.messageId };
}

export const emailService = {

  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBufferOrId) {
    const pdfBuffer = Buffer.isBuffer(pdfBufferOrId)
      ? pdfBufferOrId
      : await generateCertificatePDF(pdfBufferOrId);

    const isResidence = requestSubject?.toLowerCase().match(/r[eé]sidence|s[eé]jour/);
    const isVoirie = requestSubject?.toLowerCase().match(/voirie|road/);

    const messageBody = isVoirie
      ? `<p>Votre demande d'autorisation de voirie a été acceptée.</p>
         <p>Votre <strong>Ordre de Versement</strong> est joint en PDF.</p>
         <p>Veuillez vous présenter aux guichets du service technique muni de ce document.</p>`
      : `<p>Votre demande a été acceptée : <span style="color:#00782B;font-weight:bold">${requestSubject || 'Certificat'}</span>.</p>
         <p>Votre document officiel est joint en PDF.</p>`;

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#00782B;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
          <p style="color:#c8f5d8;margin:4px 0 0">Services Administratifs en Ligne</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
          ${messageBody}
          ${comment ? `<p style="background:#f0faf4;padding:12px;border-radius:6px;border-left:4px solid #00782B;color:#00782B;font-style:italic">Remarque : ${comment}</p>` : ''}
          <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || 'administration municipale'}</strong></p>
        </div>
        <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
          Baladiya Digital — Document généré automatiquement
        </div>
      </div>`;

    const pdfName = isResidence ? 'Carte_de_Residence.pdf'
      : isVoirie ? 'Ordre_de_Versement.pdf'
        : 'Certificat_de_Naissance.pdf';

    const subject = isVoirie
      ? 'Ordre de Versement — Autorisation de voirie'
      : `Votre document est prêt - ${requestSubject || 'Certificat'}`;

    return await sendViaBrevo({
      to: citizenEmail,
      toName: citizenFirstName,
      subject,
      htmlContent,
      pdfBuffer,
      pdfName,
    });
  },

  async sendRejectionEmail(citizenEmail, citizenFirstName, requestSubject, employeeName, comment) {
    const subLower = (requestSubject || '').toLowerCase();
    const subjectFr = subLower.includes('voirie') || subLower.includes('road') ? 'autorisation de voirie'
      : subLower.includes('residence') || subLower.includes('sejour') || subLower.includes('carte') ? 'carte de résidence'
        : subLower.includes('naissance') || subLower.includes('birth') ? 'certificat de naissance'
          : requestSubject || 'document';

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#E53E3E;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
          <p style="color:#fed7d7;margin:4px 0 0">Service d'état civil en ligne</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
          <p>Votre demande pour : <span style="color:#E53E3E;font-weight:bold">${subjectFr}</span> a été <strong>rejetée</strong>.</p>
          ${comment ? `<p style="background:#fff5f5;padding:12px;border-radius:6px;border-left:4px solid #E53E3E;color:#E53E3E;font-style:italic">Remarque : ${comment}</p>` : ''}
          <p style="margin-top:20px;color:#4A5568;">Veuillez soumettre une nouvelle demande en vous assurant que toutes les informations sont correctes.</p>
          <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || "service d'état civil"}</strong></p>
        </div>
        <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
          Baladiya Digital — Document généré automatiquement
        </div>
      </div>`;

    return await sendViaBrevo({
      to: citizenEmail,
      toName: citizenFirstName,
      subject: `Mise à jour de votre demande - ${subjectFr} rejetée`,
      htmlContent,
    });
  }
};