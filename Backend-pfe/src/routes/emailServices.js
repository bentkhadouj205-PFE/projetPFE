import { supabase } from '../supabaseClient.js';
import { Resend } from 'resend';
import PDFService from '../server/pdfservice.js';

export async function initializeEmail() {
  console.log('Email Service ready (Resend + PDFKit)');
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
    console.error(' DB fetch error:', error);
    throw new Error(`Could not fetch acte_naissance with id=${requestId}: ${error.message}`);
  }
  return data;
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

  const rawType = data.subject || data.type_document || data.requestSubject || '';
  const dType = rawType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isResidenceCard = dType.includes('residence') || dType.includes('sejour') || dType.includes('carte');

  console.log(`[PDF] Type: "${rawType}" → ${isResidenceCard ? 'Résidence' : 'Naissance'}`);

  if (isResidenceCard) {
    return await PDFService.generateCarteSejour(data);
  } else {
    return await PDFService.generateActeNaissance(data);
  }
}

let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  console.log(`[RESEND] API Key: ${apiKey ? '***set***' : 'MISSING!'}`);
  resendClient = new Resend(apiKey);
  return resendClient;
}

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

    const isResidence = requestSubject && (
      requestSubject.toLowerCase().includes('résidence') ||
      requestSubject.toLowerCase().includes('residence')
    );
    const attachmentName = isResidence ? 'Fiche_de_Residence.pdf' : 'Certificat_de_Naissance.pdf';

    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: 'Baladiya Digital <onboarding@resend.dev>',
      to: citizenEmail,
      subject: `Votre document est prêt - ${requestSubject || 'Certificat de Naissance'}`,
      html: htmlContent,
      attachments: [{
        filename: attachmentName,
        content: pdfBuffer.toString('base64'),
      }],
    });

    if (error) throw new Error(error.message);
    console.log(' [Resend Success] messageId:', data.id);
    return { messageId: data.id };
  }
};