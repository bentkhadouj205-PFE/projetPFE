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
  const clean = (val) => (!val || (typeof val === 'string' && val.includes('/../')) ? '' : val);
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('[Start] generate-and-send request received');
  try {
    const { citizenNin, requestSubject, employeeName, comment, requestId } = req.body;

    const isResidenceCard = requestSubject && (requestSubject.toLowerCase().includes('résidence') || requestSubject.toLowerCase().includes('residence') || requestSubject.toLowerCase().includes('séjour'));
    const isVoirie = requestSubject && (requestSubject.toLowerCase().includes('voirie') || requestSubject.toLowerCase().includes('road'));

    // 1. جيب الطلب من demandes بالـ NIN
    const { data: demande } = await supabase
      .from('demandes')
      .select('*')
      .eq('nin', citizenNin)
      .maybeSingle();

     // 2. جلب بيانات الأكت من Supabase (Only for birth certificates)
     let acte = null;
     let citizenForActe = null;
     if (!isResidenceCard && !isVoirie) {
       // First find the citizen to get the correct UUID id
       const { data: citizenData, error: citizenError } = await supabase
         .schema('register')
         .from('citizens')
         .select('*')
         .eq('nin', citizenNin)
         .maybeSingle();

       console.log('citizen for birth certificate search:', citizenData, citizenError);

       if (citizenData) {
         citizenForActe = citizenData;
         const { data: acteData, error: acteError } = await supabase
           .schema('register')
           .from('actes_naissance')
           .select('*')
           .eq('citizen_id', citizenData.id)
           .maybeSingle();

         console.log('acte found:', acteData);
         console.log('acte error:', acteError);
         if (acteData) {
           acte = acteData;
         }
       }
     }

     // 3. دمج البيانات للـ PDF
     const pdfData = {
       ...req.body,
       // From demandes
       fullName: demande ? `${demande.prenom} ${demande.nom}` : (acte?.nom_prenom || acte?.nom_prenom_enfant || req.body.fullName),
       citizenEmail: demande?.email || req.body.citizenEmail,
       citizenFirstName: demande?.prenom || req.body.citizenFirstName,
       nin: citizenNin,
       wilaya: demande?.wilaya_naissance || req.body.wilaya,
       commune: demande?.commune || req.body.commune,
       subject: requestSubject || 'Certificat de Naissance',
       type_document: requestSubject || 'Certificat de Naissance',

       // From citizens & actes_naissance
       numeroActe: acte?.numero_acte || req.body.actNumber,
       dateNaissance: citizenForActe?.date_naissance || acte?.date_naissance || req.body.dateNaissance || '',
       heureNaissance: acte?.heure_naissance || '',
       communeNaissance: acte?.commune_naissance || citizenForActe?.lieu_naissance || citizenForActe?.commune || demande?.commune || req.body.commune,
       wilayaNaissance: acte?.wilaya_naissance || citizenForActe?.wilaya || demande?.wilaya_naissance || req.body.wilaya,
       genre: acte?.sexe || acte?.genre_enfant || '',
       pereNomPrenom: acte?.pere_nom_prenom || acte?.nom_prenom_pere || '',
       pereAge: clean(acte?.pere_age || acte?.age_pere),
       pereMetier: clean(acte?.pere_metier || acte?.metier_pere),
       mereNomPrenom: acte?.mere_nom_prenom || acte?.nom_prenom_mere || '',
       mereAge: clean(acte?.mere_age || acte?.age_mere),
       mereMetier: clean(acte?.mere_metier || acte?.metier_mere),
       domicile: acte?.domicile || citizenForActe?.adresse || '',
       dateRedaction: acte?.date_acte || acte?.date_redaction || '',
       heureRedaction: acte?.heure_redaction || '',
       domicileCommune: clean(acte?.domicile_commune) || citizenForActe?.commune || demande?.commune || req.body.commune,
       domicileWilaya: clean(acte?.domicile_wilaya) || citizenForActe?.wilaya || demande?.wilaya_naissance || req.body.wilaya,
       declarePar: acte?.notes || acte?.declare_par || '',
       officierEtatCivil: acte?.officier_etat_civil || '',
       mentions_marginales: acte?.notes || acte?.mentions_marginales || '',
       citizens: citizenForActe,
     };

    // 4. If Residence Card or Road Authorization, fetch legal citizen data
    if (isResidenceCard || isVoirie) {
      const { data: citizen } = await supabase
        .schema('register')
        .from('citizens')
        .select('*')
        .eq('nin', citizenNin)
        .maybeSingle();

      console.log('citizen found:', citizen);

      if (citizen) {
        const fn = citizen.prenom || citizen.first_name || '';
        const ln = citizen.nom || citizen.last_name || '';
        pdfData.fullName        = `${fn} ${ln}`.trim();
        pdfData.dateNaissance   = citizen.date_naissance;
        pdfData.lieu_naissance  = citizen.lieu_naissance || citizen.commune;
        pdfData.communeNaissance = citizen.lieu_naissance || citizen.commune;
        pdfData.wilayaNaissance = citizen.wilaya;
        pdfData.domicile        = citizen.adresse;
        pdfData.adresse         = citizen.adresse;
        pdfData.wilaya          = citizen.wilaya;
        pdfData.commune         = citizen.commune;
        pdfData.nom             = pdfData.fullName;
        pdfData.projet          = isVoirie ? "AUTORISATION DE VOIRIE" : (requestSubject || "CERTIFICAT DE RESIDENCE");
      }
    }

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
    console.log('updateId:', updateId);

    if (updateId) {
      try {
        const now = new Date().toISOString();
        const dateExpiration = (isResidenceCard || isVoirie)
          ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()   // 6 months
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();      // 1 year

        const { data, error } = await supabase
          .from('demandes')
          .update({
            status: 'termine',
            date_traitement: now,
            date_expiration: dateExpiration
          })
          .eq('id', updateId);

        console.log('DB update result:', data);
        console.log('DB update error:', error);

        const io = req.app.get('io');
        if (io) {
          io.emit('status-update', { id: updateId, status: 'termine' });

          const room = `citizen_${citizenNin}`;
          const sockets = await io.in(room).fetchSockets();
          console.log('Trying to notify room:', room);
          console.log('Sockets in room:', sockets.length);

          io.to(room).emit('document-notification', {
            message: `${requestSubject} - Vérifiez votre email`,
            documentType: requestSubject,
            status: 'termine',
            dateApprobation: new Date().toISOString()
          });

          console.log('Notification emitted to:', room);
        }
      } catch (dbErr) {
        console.error('[DB Status Update Error]', dbErr.message);
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
      .select('nom_prenom_enfant, numero_acte, date_naissance, heure_naissance, wilaya_naissance, commune_naissance, genre_enfant, nom_prenom_pere, age_pere, metier_pere, nom_prenom_mere, age_mere, metier_mere, domicile, domicile_commune, domicile_wilaya, date_redaction, heure_redaction, declare_par, officier_etat_civil, mentions_marginales, nin, citizen_id')
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

// ── POST /api/email/reject ──────────────────────────────────────────
// Updates status to 'refuse' and sends rejection email to the citizen
router.post('/reject', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('[Start] reject request received');
  try {
    const { citizenEmail, citizenFirstName, citizenLastName, requestSubject, employeeName, comment, requestId, citizenNin } = req.body;

    const targetEmail = citizenEmail;
    const targetFirstName = citizenFirstName || 'Citoyen';
    const targetSubject = requestSubject || 'Document';
    const targetEmployeeName = employeeName || 'Service État Civil';
    const rejectionComment = comment || 'Votre demande a été rejetée. Veuillez réessayer.';

    // Send rejection email (no PDF)
    console.log(` [EMAIL] Sending rejection in background to: "${targetEmail}"`);
    emailService.sendRejectionEmail(
      targetEmail,
      targetFirstName,
      targetSubject,
      targetEmployeeName,
      rejectionComment
    ).catch(err => {
      console.error('Background sendRejectionEmail error:', err);
    });

    // Update status in DB to 'refuse'
    const updateId = requestId;
    console.log('updateId to reject:', updateId);

    if (updateId) {
      try {
        const { data, error } = await supabase
          .from('demandes')
          .update({
            status: 'refuse',
            commentaire: rejectionComment,
            date_traitement: new Date().toISOString()
          })
          .eq('id', updateId);

        console.log('DB reject update result:', data);
        console.log('DB reject update error:', error);

        const io = req.app.get('io');
        if (io) {
          io.emit('status-update', { id: updateId, status: 'refuse' });

          const room = `citizen_${citizenNin}`;
          io.to(room).emit('document-notification', {
            message: `${targetSubject} - Votre demande a été rejetée`,
            documentType: targetSubject,
            status: 'refuse',
            dateApprobation: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.error('[DB Reject Status Update Error]', dbErr.message);
      }
    }

    res.json({ success: true, message: 'Rejection processed successfully' });
  } catch (err) {
    console.error('reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;