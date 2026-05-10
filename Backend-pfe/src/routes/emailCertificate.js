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
    const { citizenNin, requestSubject, employeeName, comment, requestId } = req.body;

    const isResidenceCard = requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence') || requestSubject.toLowerCase().includes('séjour'));

    // 1. جيب الطلب من demandes بالـ NIN
    const { data: demande } = await supabase
      .from('demandes')
      .select('*')
      .eq('nin', citizenNin)
      .maybeSingle();

    // 2. جلب بيانات الأكت من Supabase (Only for birth certificates)
    let acte = null;
    if (!isResidenceCard) {
      const { data: citizenData } = await supabase
        .schema('register')
        .from('citizens')
        .select('id')
        .eq('nin', citizenNin)
        .maybeSingle();

      if (citizenData) {
        const { data: acteData } = await supabase
          .schema('register')
          .from('actes_naissance')
          .select('*')
          .eq('citizen_id', citizenData.id)
          .maybeSingle();
        if (acteData) acte = acteData;
      }
    }

    // 3. دمج البيانات للـ PDF
    const pdfData = {
      ...req.body,
      // From demandes
      fullName: demande ? `${demande.prenom} ${demande.nom}` : (acte?.nom_prenom_enfant || req.body.fullName),
      citizenEmail: demande?.email || req.body.citizenEmail,
      citizenFirstName: demande?.prenom || req.body.citizenFirstName,
      nin: citizenNin,
      wilaya: demande?.wilaya_naissance || req.body.wilaya,
      commune: demande?.commune || req.body.commune,
      subject: requestSubject || 'Acte de Naissance',
      type_document: requestSubject || 'Acte de Naissance',

      // From actes_naissance
      numeroActe: acte?.numero_acte || req.body.actNumber,
      dateNaissance: acte?.date_naissance || req.body.dateNaissance || '',
      heureNaissance: acte?.heure_naissance || '',
      communeNaissance: acte?.commune_naissance || demande?.commune || req.body.commune,
      wilayaNaissance: acte?.wilaya_naissance || demande?.wilaya_naissance || req.body.wilaya,
      genre: acte?.genre_enfant || '',
      pereNomPrenom: acte?.nom_prenom_pere || '',
      pereAge: acte?.age_pere || '',
      pereMetier: acte?.metier_pere || '',
      mereNomPrenom: acte?.nom_prenom_mere || '',
      mereAge: acte?.age_mere || '',
      mereMetier: acte?.metier_mere || '',
      domicileCommune: acte?.domicile_commune || demande?.commune || req.body.commune,
      domicileWilaya: acte?.domicile_wilaya || demande?.wilaya_naissance || req.body.wilaya,
      declarePar: acte?.declare_par || '',
      officierEtatCivil: acte?.officier_etat_civil || '',
      mentions_marginales: acte?.mentions_marginales || '',
    };

    // 4. Generate PDF
    console.log('NIN received:', req.body.citizenNin);
    console.log('acte found:', acte);
    console.log('pdfData:', JSON.stringify(pdfData, null, 2));

    console.time(' PDF Generation');
    const pdfBuffer = await generateCertificatePDF(pdfData);
    console.timeEnd(' PDF Generation');

    // 5. Fire-and-forget email
    const targetEmail = pdfData.citizenEmail;
    console.log(` [EMAIL] Sending in background to: "${targetEmail}"`);
    emailService.sendValidationEmailWithPDF(
      targetEmail, 
      pdfData.citizenFirstName || 'Citoyen',
      requestSubject || 'Acte de Naissance',
      employeeName || 'Service État Civil',
      comment || '',
      pdfBuffer
    );

    // 6. Update status in DB
    const updateId = requestId || demande?.id;
    if (updateId) {
      try {
        const result = await pool.query("UPDATE demandes SET statut = 'approuve' WHERE id = $1", [updateId]);
        if (result.rowCount === 0) {
          await supabase.from('demandes').update({ statut: 'approuve' }).eq('id', updateId);
        }
        const io = req.app.get('io');
        if (io) io.emit('status-update', { id: updateId, status: 'approuve' });
      } catch (dbErr) {
        console.error(' [DB Status Update Error]', dbErr.message);
      }
    }

    res.json({ success: true, message: 'Process started successfully' });

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