import express from 'express';
import { emailService, generateCertificatePDF } from './emailServices.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// ── POST /api/email/generate-pdf ──────────────────────────────────────────
// Génère le PDF et le renvoie en Base64 au frontend
router.post('/generate-pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateCertificatePDF(req.body);
    const pdfBase64 = pdfBuffer.toString('base64');
    res.json({ pdfBase64 });
  } catch (err) {
    console.error('❌ generate-pdf error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/email/generate-and-send ─────────────────────────────────────
// Génère le PDF ET l'envoie par email au citoyen
router.post('/generate-and-send', async (req, res) => {
  try {
    const {
      citizenEmail,
      citizenFirstName,
      citizenLastName,
      requestSubject,
      employeeName,
      comment,
      ...data
    } = req.body;

    // Passe toutes les infos à la génération PDF
    const pdfBuffer = await generateCertificatePDF({
      ...data,
      citizenEmail,
      citizenFirstName,
      citizenLastName,
    });

    // Envoie l'email avec le PDF en pièce jointe
    const info = await emailService.sendValidationEmailWithPDF(
      citizenEmail,
      citizenFirstName,
      requestSubject || 'Acte de Naissance',
      'completed',
      employeeName || 'Service État Civil',
      comment || 'Votre document est prêt.',
      pdfBuffer
    );

    res.json({ success: true, messageId: info?.messageId || 'sent' });
  } catch (err) {
    console.error('❌ generate-and-send error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;