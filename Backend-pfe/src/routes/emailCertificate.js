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
      .order('id', { ascending: false })
      .limit(1)
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
         .order('id', { ascending: false })
         .limit(1)
         .maybeSingle();

       console.log('citizen for birth certificate search:', citizenData, citizenError);

       if (citizenData) {
         citizenForActe = citizenData;
       }

       const realCitizenId = citizenData?.id;
       let acteData = null;
       let acteError = null;

       if (realCitizenId) {
         const { data, error } = await supabase
           .schema('register')
           .from('actes_naissance')
           .select('*')
           .eq('citizen_id', realCitizenId)
           .order('id', { ascending: false })
           .limit(1)
           .maybeSingle();
         acteData = data;
         acteError = error;
       }

       // Fallback: try by NIN
       if (!acteData && citizenNin) {
         const { data, error } = await supabase
           .schema('register')
           .from('actes_naissance')
           .select('*')
           .eq('nin', citizenNin)
           .order('id', { ascending: false })
           .limit(1)
           .maybeSingle();
         acteData = data;
         if (!acteError) acteError = error;
       }

        console.log('[Supabase] Acte search result:', acteData ? 'FOUND' : 'NOT FOUND');
        if (acteError) {
          console.error('[Supabase Error] Acte fetch failed:', acteError);
        }
        if (acteData) {
          acte = acteData;
        }
     }

     // 3. دمج البيانات للـ PDF
     const pdfData = {
       ...req.body,
       // From demandes / actes_naissance
       fullName: acte?.nom_prenom_enfant || (demande ? `${demande.prenom} ${demande.nom}` : (acte?.nom_prenom || req.body.fullName)),
       citizenEmail: demande?.email || req.body.citizenEmail,
       citizenFirstName: demande?.prenom || req.body.citizenFirstName,
       nin: citizenNin,
       wilaya: demande?.wilaya_naissance || req.body.wilaya,
       commune: demande?.commune || req.body.commune,
       subject: requestSubject || 'Certificat de Naissance',
       type_document: requestSubject || 'Certificat de Naissance',

       // From citizens & actes_naissance
       numeroActe: acte?.numero_acte || req.body.actNumber || req.body.numeroActe,
       dateNaissance: acte?.date_naissance || citizenForActe?.date_naissance || req.body.dateNaissance || '',
       heureNaissance: acte?.heure_naissance || req.body.heureNaissance || '',
       communeNaissance: acte?.commune_naissance || citizenForActe?.lieu_naissance || citizenForActe?.commune || demande?.commune || req.body.commune,
       wilayaNaissance: acte?.wilaya_naissance || citizenForActe?.wilaya || demande?.wilaya_naissance || req.body.wilaya,
       genre: acte?.genre_enfant || acte?.sexe || req.body.genre || '',
       pereNomPrenom: acte?.nom_prenom_pere || acte?.pere_nom_prenom || req.body.pereNomPrenom || '',
       pereAge: clean(acte?.age_pere || acte?.pere_age || req.body.pereAge),
       pereMetier: clean(acte?.metier_pere || acte?.pere_metier || req.body.pereMetier),
       mereNomPrenom: acte?.nom_prenom_mere || acte?.mere_nom_prenom || req.body.mereNomPrenom || '',
       mereAge: clean(acte?.age_mere || acte?.mere_age || req.body.mereAge),
       mereMetier: clean(acte?.metier_mere || acte?.mere_metier || req.body.mereMetier),
       domicile: acte?.domicile || citizenForActe?.adresse || req.body.domicile || '',
       dateRedaction: acte?.date_redaction || acte?.date_acte || req.body.dateRedaction || '',
       heureRedaction: acte?.heure_redaction || req.body.heureRedaction || '',
       domicileCommune: clean(acte?.domicile_commune) || citizenForActe?.commune || demande?.commune || req.body.domicileCommune || req.body.commune,
       domicileWilaya: clean(acte?.domicile_wilaya) || citizenForActe?.wilaya || demande?.wilaya_naissance || req.body.domicileWilaya || req.body.wilaya,
       declarePar: acte?.declare_par || acte?.notes || req.body.declarePar || '',
       officierEtatCivil: acte?.officier_etat_civil || req.body.officierEtatCivil || '',
       mentions_marginales: acte?.mentions_marginales || acte?.notes || req.body.mentions_marginales || '',
       citizens: citizenForActe,
     };

     if (acte) {
       Object.assign(pdfData, {
         // Direct DB column names from actes_naissance
         numero_acte:        acte.numero_acte,
         date_naissance:     acte.date_naissance,
         heure_naissance:    acte.heure_naissance,
         commune_naissance:  acte.commune_naissance,
         wilaya_naissance:   acte.wilaya_naissance,
         nom_prenom_enfant:  acte.nom_prenom_enfant,
         genre_enfant:       acte.genre_enfant,
         nom_prenom_pere:    acte.nom_prenom_pere,
         age_pere:           acte.age_pere,
         metier_pere:        acte.metier_pere,
         nom_prenom_mere:    acte.nom_prenom_mere,
         age_mere:           acte.age_mere,
         metier_mere:        acte.metier_mere,
         domicile:           acte.domicile,
         domicile_commune:   acte.domicile_commune,
         domicile_wilaya:    acte.domicile_wilaya,
         date_redaction:     acte.date_redaction,
         heure_redaction:    acte.heure_redaction,
         declare_par:        acte.declare_par,
         officier_etat_civil: acte.officier_etat_civil,
         mentions_marginales: acte.mentions_marginales,
       });
     } else {
       // Fallback: citizen basic info only — acte fields will show as dots
       console.warn(`[WARN] No acte found for citizen ${citizenData?.id} / NIN ${citizenNin}`);
       pdfData.date_naissance    = citizenData?.date_naissance || '';
       pdfData.commune_naissance = citizenData?.lieu_naissance || citizenData?.commune || '';
       pdfData.wilaya_naissance  = citizenData?.wilaya || '';
       pdfData.nom_prenom_enfant = `${citizenData?.prenom || ''} ${citizenData?.nom || ''}`.trim();
     }

    // 4. If Residence Card or Road Authorization, fetch legal citizen data
    if (isResidenceCard || isVoirie) {
      const { data: citizen } = await supabase
        .schema('register')
        .from('citizens')
        .select('*')
        .eq('nin', citizenNin)
        .order('id', { ascending: false })
        .limit(1)
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
    ).catch(err => console.error('[EMAIL background error]', err?.message || err));

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