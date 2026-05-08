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
      wilaya, commune, actYear, actNumber,
    } = req.body;

    const isResidenceCard = requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence') || requestSubject.toLowerCase().includes('séjour'));

    // 1. جلب بيانات الأكت من Supabase (Only for birth certificates)
    let acte = null;
    if (!isResidenceCard) {
      console.time(' Supabase Fetch');
      const { data, error } = await supabase
        .schema('register')
        .from('actes_naissance')
        .select('*')
        .eq('citizen_id', citizen_id || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      console.timeEnd(' Supabase Fetch');
      if (!error) acte = data;
    }

    // دمج البيانات
    const pdfData = {
      ...req.body,
      subject: requestSubject || 'Fiche de Résidence',
      type_document: requestSubject || 'Fiche de Résidence',
      citizenEmail,
      citizenFirstName,
      fullName: acte?.nom_prenom || `${citizenFirstName} ${req.body.citizenLastName || ''}`,
      numeroChahada: acte?.numero_chahada || actNumber,
      numeroActe: acte?.numero_acte || actNumber,
      dateNaissance: acte?.date_naissance || req.body.dateNaissance || '',
      heureNaissance: acte?.heure_naissance || '',
      wilayaNaissance: acte?.wilaya_naissance || wilaya,
      communeNaissance: acte?.commune_naissance || commune,
      sexe: acte?.sexe || '',
      pereNomPrenom: acte?.pere_nom_prenom || '',
      pereAge: acte?.pere_age || '',
      pereMetier: acte?.pere_metier || '',
      mereNomPrenom: acte?.mere_nom_prenom || '',
      mereAge: acte?.mere_age || '',
      mereMetier: acte?.mere_metier || '',
      domicileCommune: acte?.domicile_commune || commune,
      domicileWilaya: acte?.domicile_wilaya || wilaya,
      heureRedaction: acte?.heure_redaction || '',
      redigeA: acte?.redige_a || commune,
      declarePar: acte?.declare_par || '',
      officierEtatCivil: acte?.officier_etat_civil || '',
      marginalNotes: acte?.marginal_notes || '',
      wilayaDelivrance: acte?.wilaya_delivrance || wilaya,
      dateDelivrance: acte?.date_delivrance || new Date().toISOString().split('T')[0],
      // Residence Card specific
      adresse: req.body.adresse || '',
      wilaya: wilaya,
      commune: commune,
    };

    // 2. Generate PDF
    console.time(' PDF Generation');
    const pdfBuffer = await generateCertificatePDF(pdfData);
    console.timeEnd(' PDF Generation');

    // 3. Send Email
    console.time(' Brevo API Send');
    await emailService.sendValidationEmailWithPDF(
      citizenEmail, citizenFirstName,
      requestSubject || 'Acte de Naissance',
      employeeName || 'Service État Civil',
      comment || '',
      pdfBuffer
    );
    console.timeEnd(' Brevo API Send');

    // 4. Update status with fallback
    if (requestId) {
      try {
        console.log(' [DB] Attempting PostgreSQL update for ID:', requestId);
        const result = await pool.query(
          "UPDATE requests SET status = 'completed', document_status = 'approved' WHERE id = $1::text OR id::text = $1",
          [String(requestId)]
        );

        console.log('  PostgreSQL updated, rows affected:', result.rowCount);

        if (result.rowCount === 0) {
          console.log('  No rows in PostgreSQL, trying Supabase (register schema)...');
          const { error } = await supabase
            .schema('register')
            .from('requests')
            .update({ status: 'completed', document_status: 'approved' })
            .eq('id', requestId);

          if (error) {
            console.error('  Supabase update error:', error.message);
          } else {
            console.log('  Supabase updated successfully');
          }
        }
      } catch (dbErr) {
        console.error('  DB Status Update Error:', dbErr.message);
      }
    }

    console.log(' [Success] Email sent and status updated');
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
    const pdfBuffer = await PDFService.generateOfficialActeNaissance(acte);

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