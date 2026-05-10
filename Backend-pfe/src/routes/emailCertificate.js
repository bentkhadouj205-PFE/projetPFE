import express from 'express';
import { emailService, generateCertificatePDF } from './emailServices.js';
import { supabase } from '../supabaseClient.js';
import pool from '../db.js';
import PDFService from '../server/pdfservice.js';


const router = express.Router();

// ── POST /api/email/generate-pdf ──────────────────────────────────────────
// Génère le PDF et le renvoie en Base64 au frontend
router.post('/generate-pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateCertificatePDF(req.body);
    const pdfBase64 = pdfBuffer.toString('base64');
    res.json({ pdfBase64 });
  } catch (err) {
    console.error(' generate-pdf error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/email/generate-and-send ─────────────────────────────────────
// Génère le PDF ET l'envoie par email au citoyen
router.post('/generate-and-send', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('[Start] generate-and-send request received');
  try {
    const {
      citizenEmail, citizenFirstName, requestSubject,
      employeeName, comment, requestId, citizen_id,
      wilaya, commune, actYear, actNumber, acteId,
    } = req.body;

    const isResidenceCard = requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence') || requestSubject.toLowerCase().includes('séjour'));

    // 1. جلب بيانات الأكت من Supabase (Only for birth certificates)
    let acte = null;
    if (!isResidenceCard) {
      console.time(' Supabase Fetch');
      try {
        // 1. جيب citizen_id من citizens بالـ NIN
        const { data: citizenData, error: citizenError } = await supabase
          .schema('register')
          .from('citizens')
          .select('id')
          .eq('nin', req.body.citizenNin)
          .single();

        if (citizenData && !citizenError) {
          // 2. جيب الأكت بالـ citizen_id
          const { data: acteData, error: acteError } = await supabase
            .schema('register')
            .from('actes_naissance')
            .select('*')
            .eq('citizen_id', citizenData.id)
            .single();

          if (!acteError) acte = acteData;
        }
      } catch (err) {
        console.error(' [DB Error] Fetching acte failed:', err);
      }
      console.timeEnd(' Supabase Fetch');

      console.log('req.body:', req.body);
      console.log('citizenNin:', req.body.citizenNin);
      console.log('acte from DB:', acte);
    }

    // دمج البيانات
    const pdfData = {
      ...req.body,
      subject: requestSubject || 'Fiche de Résidence',
      type_document: requestSubject || 'Fiche de Résidence',
      citizenEmail,
      citizenFirstName,
      fullName: acte?.nom_prenom_enfant || `${citizenFirstName} ${req.body.citizenLastName || ''}`,
      numeroActe: acte?.numero_acte || actNumber,
      dateNaissance: acte?.date_naissance || req.body.dateNaissance || '',
      heureNaissance: acte?.heure_naissance || '',
      wilayaNaissance: acte?.wilaya_naissance || wilaya,
      communeNaissance: acte?.commune_naissance || commune,
      genre: acte?.genre_enfant || '',
      pereNomPrenom: acte?.nom_prenom_pere || '',
      pereAge: acte?.age_pere || '',
      pereMetier: acte?.metier_pere || '',
      mereNomPrenom: acte?.nom_prenom_mere || '',
      mereAge: acte?.age_mere || '',
      mereMetier: acte?.metier_mere || '',
      domicileCommune: acte?.domicile_commune || commune,
      domicileWilaya: acte?.domicile_wilaya || wilaya,
      heureRedaction: acte?.heure_redaction || '',
      declarePar: acte?.declare_par || '',
      officierEtatCivil: acte?.officier_etat_civil || '',
      mentions_marginales: acte?.mentions_marginales || '',
    };

    // 2. Generate PDF
    console.time(' PDF Generation');
    const pdfBuffer = await generateCertificatePDF(pdfData);
    console.timeEnd(' PDF Generation');

    // 3. Fire-and-forget email — respond to frontend immediately
    console.log(` [EMAIL] Sending in background to: "${citizenEmail}"`);
    emailService.sendValidationEmailWithPDF(
      citizenEmail, citizenFirstName,
      requestSubject || 'Acte de Naissance',
      employeeName || 'Service État Civil',
      comment || '',
      pdfBuffer
    ).then(info => {
      console.log(` [EMAIL SUCCESS] Sent to ${citizenEmail} | messageId:`, info?.messageId);
    }).catch(emailErr => {
      console.error(` [EMAIL ERROR] Failed to send to ${citizenEmail}:`, emailErr.message);
    });

    // 4. Update status in DB
    const updateId = citizen_id || requestId;
    if (updateId) {
      try {
        const result = await pool.query(
          "UPDATE demandes SET statut = 'approuve' WHERE id = $1",
          [updateId]
        );
        if (result.rowCount === 0) {
          await supabase
            .schema('register')
            .from('demandes')
            .update({ statut: 'approuve' })
            .eq('id', updateId);
        }
        const io = req.app.get('io');
        if (io) {
          io.emit('status-update', { id: updateId, status: 'approuve', documentStatus: 'approved' });
        }
      } catch (dbErr) {
        console.error('  DB Status Update Error:', dbErr.message);
      }
    }

    // Respond immediately — email sends in background
    res.json({ success: true });

  } catch (err) {
    console.error(' generate-and-send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/email/send-official-acte/:acteId ────────────────────────────
// Génère l'acte officiel à partir du template et l'envoie par email
router.post('/send-official-acte/:acteId', async (req, res) => {
  try {
    const { email, name } = req.body;

    // Fetch acte
    const { data: acte, error } = await supabase
      .schema('register')
      .from('actes_naissance')
      .select('nom_prenom, numero_chahada, numero_acte, date_naissance, heure_naissance, wilaya_naissance, commune_naissance, sexe, pere_nom_prenom, pere_age, pere_metier, mere_nom_prenom, mere_age, mere_metier, domicile_commune, domicile_wilaya, heure_redaction, redige_a, declare_par, officier_etat_civil, marginal_notes, wilaya_delivrance, date_delivrance')
      .eq('id', req.params.acteId)
      .single();

    if (error || !acte) return res.status(404).json({ error: 'Acte non trouvé' });

    // Generate PDF
    const pdfBuffer = await PDFService.generateActeNaissance(acte);

    // Envoie l'email avec le PDF officiel en pièce jointe
    const info = await emailService.sendValidationEmailWithPDF(
      email,
      name || acte.nom_prenom,
      'Acte de Naissance Officiel',
      'completed',
      'Service État Civil',
      'Votre acte de naissance officiel est prêt.',
      pdfBuffer
    );

    res.json({ success: true, messageId: info?.messageId || 'sent' });

  } catch (err) {
    console.error(' send-official-acte error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;