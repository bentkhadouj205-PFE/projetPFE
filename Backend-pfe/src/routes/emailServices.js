import { supabase } from '../supabaseClient.js';
import PDFService from '../server/pdfservice.js';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

// Force DNS resolution to prefer IPv4 to completely prevent IPv6 ENETUNREACH errors
dns.setDefaultResultOrder('ipv4first');

const resolve4 = promisify(dns.resolve4);

let transporter = null;

async function createIpv4Transporter() {
  try {
    const addresses = await resolve4('smtp.gmail.com');
    const ipv4 = addresses[0];
    return nodemailer.createTransport({
      host: ipv4,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'baladiyadigital27@gmail.com',
        pass: process.env.SMTP_PASS || 'ctrbiowopulkfocs',
      },
      tls: {
        servername: 'smtp.gmail.com' // required since we are connecting via IP
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } catch (err) {
    console.warn('Failed to resolve smtp.gmail.com to IPv4, falling back to hostname', err.message);
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'baladiyadigital27@gmail.com',
        pass: process.env.SMTP_PASS || 'ctrbiowopulkfocs',
      },
      family: 4,
    });
  }
}

export async function initializeEmail() {
  transporter = await createIpv4Transporter();
  console.log('Email Service ready (Gmail SMTP IPv4 + Brevo Fallback)');
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

  console.log(`[PDF] Type: "${rawType}" → ${isResidenceCard ? 'Résidence' : isVoirie ? 'Voirie (Ordre de Versement)' : 'Naissance'}`);

  if (isResidenceCard) {
    return await PDFService.generateCarteSejour(data);
  } else if (isVoirie) {
    return await PDFService.generateOrdreVersement(data);
  } else {
    return await PDFService.generateActeNaissance(data);
  }
}

export const emailService = {
  async sendValidationEmailWithPDF(citizenEmail, citizenFirstName, requestSubject, employeeName, comment, pdfBufferOrId) {
    let pdfBuffer;
    if (Buffer.isBuffer(pdfBufferOrId)) {
      pdfBuffer = pdfBufferOrId;
    } else {
      pdfBuffer = await generateCertificatePDF(pdfBufferOrId);
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER || 'baladiyadigital27@gmail.com';
    console.log(`[EMAIL] Attempting delivery to: "${citizenEmail}" via SMTP...`);

    const isResidence = requestSubject && (
      requestSubject.toLowerCase().includes('résidence') ||
      requestSubject.toLowerCase().includes('residence') ||
      requestSubject.toLowerCase().includes('séjour')
    );
    const isVoirie = requestSubject && (
      requestSubject.toLowerCase().includes('voirie') ||
      requestSubject.toLowerCase().includes('road')
    );

    const messageBody = isVoirie
      ? `
          <p>Votre demande d'autorisation de voirie a été acceptée avec succès.</p>
          <p>Votre <strong>Ordre de Versement</strong> officiel a été généré et se trouve en pièce jointe au format PDF.</p>
          <p>Veuillez vous présenter aux guichets du service technique de la commune muni de ce document afin d'effectuer le paiement requis.</p>
        `
      : `
          <p>Votre demande a été acceptée : <span style="color:#00782B;font-weight:bold">${requestSubject || 'Certificat'}</span>.</p>
          <p>Votre document officiel est joint en format PDF.</p>
        `;

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
          <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || "administration municipale"}</strong></p>
        </div>
        <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
          Baladiya Digital — Document généré automatiquement
        </div>
      </div>
    `;

    let attachmentName = 'Certificat_de_Naissance.pdf';
    let emailSubject = `Votre document est prêt - ${requestSubject || 'Certificat'}`;

    if (isResidence) {
      attachmentName = 'Carte_de_Residence.pdf';
    } else if (isVoirie) {
      attachmentName = 'Ordre_de_Versement.pdf';
      emailSubject = 'Ordre de Versement — Autorisation de voirie';
    }

    // Try Nodemailer/Gmail SMTP first
    try {
      const info = await transporter.sendMail({
        from: `"Baladiya Digital" <${senderEmail}>`,
        to: citizenEmail,
        subject: emailSubject,
        html: htmlContent,
        attachments: [{
          filename: attachmentName,
          content: pdfBuffer,
        }],
      });
      console.log('[Nodemailer Success] Sent via Gmail SMTP. Message ID:', info.messageId);
      return { messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[Nodemailer Error] SMTP delivery failed, falling back to Brevo:', smtpErr.message);

      // Fallback to Brevo
      const payload = {
        sender: { name: 'Baladiya Digital', email: senderEmail },
        to: [{ email: citizenEmail, name: citizenFirstName || 'Citoyen' }],
        subject: emailSubject,
        htmlContent,
        attachment: [{
          name: attachmentName,
          content: pdfBuffer.toString('base64'),
          type: 'application/pdf',
        }],
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

      if (!response.ok) {
        throw new Error(result.message || `Brevo API error: ${response.status}`);
      }

      console.log('[Brevo Success] messageId:', result.messageId);
      return { messageId: result.messageId };
    }
  },

  async sendRejectionEmail(citizenEmail, citizenFirstName, requestSubject, employeeName, comment) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER || 'baladiyadigital27@gmail.com';
    console.log(`[EMAIL] Attempting rejection to: "${citizenEmail}" via SMTP...`);

    let subjectFr = requestSubject || 'document';
    const subLower = subjectFr.toLowerCase();
    if (subLower.includes('voirie') || subLower.includes('road')) {
      subjectFr = 'autorisation de voirie';
    } else if (subLower.includes('residence') || subLower.includes('sejour') || subLower.includes('carte')) {
      subjectFr = 'carte de résidence';
    } else if (subLower.includes('naissance') || subLower.includes('birth')) {
      subjectFr = 'certificat de naissance';
    }

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#E53E3E;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Baladiya Digital</h1>
          <p style="color:#fed7d7;margin:4px 0 0">Service d'état civil en ligne</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:16px">Bonjour <strong>${citizenFirstName || ''}</strong>,</p>
          <p>Nous vous informons que votre demande pour le document : <span style="color:#E53E3E;font-weight:bold">${subjectFr}</span> a été <strong>rejetée</strong>.</p>
          ${comment ? `<p style="background:#fff5f5;padding:12px;border-radius:6px;border-left:4px solid #E53E3E;color:#E53E3E;font-style:italic">Remarque : ${comment}</p>` : ''}
          <p style="margin-top:20px;color:#4A5568;">Veuillez soumettre une nouvelle demande en vous assurant que toutes les informations et documents joints sont corrects et lisibles.</p>
          <p style="color:#888;font-size:13px;margin-top:20px">Traité par : <strong>${employeeName || "service d'état civil"}</strong></p>
        </div>
        <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#aaa">
          Baladiya Digital — Document généré automatiquement
        </div>
      </div>
    `;

    // Try Nodemailer/Gmail SMTP first
    try {
      const info = await transporter.sendMail({
        from: `"Baladiya Digital" <${senderEmail}>`,
        to: citizenEmail,
        subject: `Mise à jour de votre demande - ${subjectFr} rejetée`,
        html: htmlContent,
      });
      console.log('[Nodemailer Rejection Success] Sent via Gmail SMTP. Message ID:', info.messageId);
      return { messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[Nodemailer Rejection Error] SMTP failed, falling back to Brevo:', smtpErr.message);

      // Fallback to Brevo
      const payload = {
        sender: { name: 'Baladiya Digital', email: senderEmail },
        to: [{ email: citizenEmail, name: citizenFirstName || 'Citoyen' }],
        subject: `Mise à jour de votre demande - ${subjectFr} rejetée`,
        htmlContent,
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

      if (!response.ok) {
        throw new Error(result.message || `Brevo API error: ${response.status}`);
      }

      console.log('[Brevo Rejection Success] messageId:', result.messageId);
      return { messageId: result.messageId };
    }
  }
};