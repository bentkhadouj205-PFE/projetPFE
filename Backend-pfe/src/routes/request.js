import express from 'express';
import pool from '../db.js'; // pg Pool
import { emailService, initializeEmail } from './emailServices.js';
import { PDFService } from '../server/pdfservice.js';
import bcrypt from 'bcrypt';
import { supabase } from '../supabaseClient.js';

const router = express.Router();
let emailInitialized = false;

// ── POST /requests/submit ─────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  try {
    if (!emailInitialized) {
      await initializeEmail();
      emailInitialized = true;
    }

    const { citizenData, subject, description, serviceType } = req.body;
    // citizenData: { firstName, lastName, email, nin, address }

    // Find the employee whose `service` matches the requested serviceType
    const { rows: empRows } = await pool.query(
      `SELECT id, first_name, last_name, email, service, position
       FROM employees
       WHERE status = 'active'
         AND LOWER(service) LIKE LOWER($1)
       LIMIT 1`,
      [`%${serviceType}%`]
    );

    if (empRows.length === 0) {
      return res.status(400).json({ message: `Aucun employé disponible pour le service: ${serviceType}` });
    }

    const emp = empRows[0];
    const empFullName = `${emp.first_name} ${emp.last_name}`;

    const { rows } = await pool.query(
      `INSERT INTO demandes
         (citizen_first_name, citizen_last_name, citizen_email, citizen_nin,
           citizen_address,
          subject, description,
          assigned_to, assigned_employee_name,
          status, document_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending')
       RETURNING *`,
      [
        citizenData.firstName,
        citizenData.lastName,
        citizenData.email,
        citizenData.nin,
        citizenData.address,
        subject,
        description,
        emp.id,
        empFullName
      ]
    );

    const newRequest = rows[0];
    console.log('Demande enregistrée:', newRequest.id);

    try {
      await emailService.sendEmployeeNotification(
        emp.email, empFullName,
        `${citizenData.firstName} ${citizenData.lastName}`,
        subject, serviceType
      );
    } catch (emailError) {
      console.error('Email failed:', emailError.message);
    }

    res.status(201).json({
      message: 'Demande soumise avec succès',
      requestId: newRequest.id,
      assignedTo: {
        id: emp.id,
        name: empFullName,
        position: emp.position,
        service: emp.service
      }
    });
  } catch (error) {
    console.error('Erreur submit:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── POST /requests/login (employee login) ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Query Supabase employees table instead of PostgreSQL
    const { data: emp, error } = await supabase
      .from('employees')
      .select('id, email, password_hash, first_name, last_name, role, service, position, status')
      .eq('email', email.trim())
      .single();

    if (error || !emp) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    if (emp.status !== 'active') {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const match = await bcrypt.compare(password, emp.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    console.log(`Connexion employé (Supabase): ${emp.first_name} ${emp.last_name} (${emp.position})`);

    res.json({
      message: 'Connexion réussie',
      employee: {
        id: emp.id,  // returns Supabase UUID
        email: emp.email,
        firstName: emp.first_name,
        lastName: emp.last_name,
        role: emp.role,
        service: emp.service,
        position: emp.position
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /demandes (all or filtered by service) ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { service } = req.query;
    console.log('SERVICE RECEIVED:', service);

    if (!service) {
      return res.status(400).json({ message: 'Le paramètre service est requis' });
    }

    // Mapping layer to ensure UI names match DB types
    const serviceMap = {
      'Civil Status': 'certificat_naissance',
      'Residence': 'certificat_residence',
      'Mariage': 'certificat_mariage',
      'Voirie': 'authorisation_de_voirie',
      'Technical Service': 'authorisation_de_voirie',
      'Service Technique': 'authorisation_de_voirie',
      'Road Occupancy Permit': 'authorisation_de_voirie',
      'autorisation de voirie': 'authorisation_de_voirie',
      'authorisation_de_voirie': 'authorisation_de_voirie',
      'autorisation_voirie': 'authorisation_de_voirie',
      'certificat_naissance': 'certificat_naissance',
      'certificat_residence': 'certificat_residence',
      'certificat_mariage': 'certificat_mariage'
    };

    const dbService = serviceMap[service] || service;

    let query = supabase.from('demandes').select('*');
    if (dbService) {
      query = query.eq('type_document', dbService);
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log(`RESULT for ${dbService}:`, data.length);
    res.json({ requests: data });
  } catch (error) {
    console.error('Request fetch error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/my-requests/:employeeId ─────────────────────────────────────
router.get('/my-requests/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Step 1: get employee from Supabase using their UUID
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, email, service, position')
      .eq('id', employeeId)
      .single();

    if (empError || !emp) {
      console.error('Employee lookup error:', empError);
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    const position = (emp.position || '').toLowerCase();
    let documentTypes = [];

    if (position.includes('naissance')) {
      documentTypes = ['extrait_naissance'];
    } else if (position.includes('résidence') || position.includes('residence') || position.includes('fiche')) {
      documentTypes = ['certificat_residence'];
    } else if (position.includes('mariage')) {
      documentTypes = ['certificat_mariage'];
    } else if (position.includes('voirie')) {
      documentTypes = ['authorisation_de_voirie'];
    }

    if (!documentTypes.length) {
      return res.json({ count: 0, requests: [] });
    }

    // Step 2: query Supabase demandes by document type
    const { data: demandes, error } = await supabase
      .from('demandes')
      .select('*')
      .in('type_document', documentTypes)
      .order('date_demande', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    // Auto-fill citizen_address from demandes_inscription → users → citizens (in priority order)
    const enrichedDemandes = await Promise.all(demandes.map(async (d) => {
      // Ensure nin is explicitly handled if it's missing or named differently
      const citizenNin = d.nin || d.citizen_nin;
      if (d.citizen_address || !citizenNin) return { ...d, nin: citizenNin };
      try {
        // 1st priority: demandes_inscription (type_document = certificat_residence) has the adresse
        const { data: inscriptData } = await supabase
          .from('demandes_inscription')
          .select('adresse')
          .eq('nin', citizenNin)
          .eq('type_document', 'certificat_residence')
          .order('date_demande', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (inscriptData?.adresse) {
          return { ...d, citizen_address: inscriptData.adresse, adresse: inscriptData.adresse, nin: citizenNin };
        }

        // 2nd priority: users table
        const { data: userData } = await supabase
          .from('users')
          .select('adresse')
          .eq('nin', citizenNin)
          .maybeSingle();
        if (userData?.adresse) {
          return { ...d, citizen_address: userData.adresse, adresse: userData.adresse, nin: citizenNin };
        }

        // 3rd priority: citizens table
        const { data: citizenData } = await supabase
          .from('citizens')
          .select('adresse, address')
          .eq('nin', citizenNin)
          .maybeSingle();
        if (citizenData?.adresse || citizenData?.address) {
          const addr = citizenData.adresse || citizenData.address;
          return { ...d, citizen_address: addr, adresse: addr, nin: citizenNin };
        }
      } catch (_) { /* silently ignore */ }
      return { ...d, nin: citizenNin };
    }));

    res.json({ count: enrichedDemandes.length, requests: enrichedDemandes });

  } catch (error) {
    console.error('Error in my-requests:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/all-requests ────────────────────────────────────────────────
router.get('/all-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM demandes ORDER BY created_at DESC`
    );
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/status/:status ──────────────────────────────────────────────
router.get('/status/:status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM demandes WHERE status = $1 ORDER BY created_at DESC`,
      [req.params.status]
    );
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /requests/:requestId/read ─────────────────────────────────────────────
router.put('/:requestId/read', async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('demandes')
      .update({ status: 'lu' })
      .eq('id', requestId)
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/:requestId ──────────────────────────────────────────────────
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { data, error } = await supabase
      .from('demandes')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /requests/validate-with-pdf/:requestId ────────────────────────────────
router.put('/validate-with-pdf/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, documentStatus, comment, position } = req.body;

    // 1. Fetch request from Supabase
    const { data: request, error: fetchErr } = await supabase
      .from('demandes')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    // Map status from frontend (English) to DB (French) for 'demandes' table
    const statusMap = {
      'completed': 'termine',
      'rejected': 'refuse',
      'in-progress': 'en_cours',
      'pending': 'en_attente'
    };
    const dbStatus = statusMap[status] || status;

    // 2. Update request in Supabase (table 'demandes' uses 'status' and 'commentaire')
    const now = new Date().toISOString();
    const isResidence = request.type_document === 'certificat_residence';
    const dateExpiration = isResidence
      ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()   // 6 months
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();      // 1 year

    const { data: updated, error: updateErr } = await supabase
      .from('demandes')
      .update({
        status: dbStatus,
        commentaire: comment || request.commentaire,
        date_traitement: dbStatus === 'termine' ? now : request.date_traitement,
        date_expiration: dbStatus === 'termine' ? dateExpiration : request.date_expiration
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    console.log('Validation demande (Supabase):', requestId, '| Statut:', dbStatus);

    // 3. Generate PDF
    let pdfBuffer = null;
    try {
      const { generateCertificatePDF } = await import('./emailServices.js');
      pdfBuffer = await generateCertificatePDF(updated);
      console.log('PDF généré via emailServices:', pdfBuffer?.length, 'bytes');
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError.message);
    }

    // 4. Send email (Fetch email from users table if missing)
    let emailSent = false;
    let targetEmail = updated.email || updated.citizen_email;

    if (!targetEmail && updated.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', updated.user_id)
        .single();
      if (userData) targetEmail = userData.email;
    }

    if (pdfBuffer && targetEmail && status === 'completed') {
      try {
        await emailService.sendValidationEmailWithPDF(
          targetEmail,
          updated.prenom || updated.firstName || 'Citoyen',
          updated.type_document || 'Certificat de Naissance',
          position || 'Service État Civil',
          comment || 'Votre demande a été traitée avec succès.',
          pdfBuffer
        );
        emailSent = true;
      } catch (emailError) {
        console.error('Email Transmission Error:', emailError.message);
      }
    }

    res.json({
      message: 'Demande traitée',
      request: updated,
      pdfGenerated: !!pdfBuffer,
      emailSent
    });
  } catch (error) {
    console.error('Erreur validation:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/:requestId/download-pdf ─────────────────────────────────────
router.get('/:requestId/download-pdf', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM demandes  WHERE id = $1`,
      [req.params.requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    const pdfBuffer = await PDFService.generateCitizenPDF(rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=demande-${rows[0].id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /requests/:requestId/status ───────────────────────────────────────────
router.put('/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, comment } = req.body;

    // Map status to match DB conventions if needed
    const statusMap = {
      'completed': 'termine',
      'rejected': 'refuse',
      'in-progress': 'en_traitement',
      'pending': 'en_attente',
      'approuve': 'termine'
    };
    const dbStatus = statusMap[status] || status;

    const updatePayload = {
      status: dbStatus,
      commentaire: comment || undefined
    };
    if (dbStatus === 'termine') {
      // Fetch type_document to determine expiration period
      const { data: demandeInfo } = await supabase
        .from('demandes')
        .select('type_document')
        .eq('id', requestId)
        .single();

      const isResidence = demandeInfo?.type_document === 'certificat_residence';
      updatePayload.date_traitement = new Date().toISOString();
      updatePayload.date_expiration = isResidence
        ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()   // 6 months
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();      // 1 year
    }

    const { data, error } = await supabase
      .from('demandes')
      .update(updatePayload)
      .eq('id', requestId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    res.json({ message: 'Statut mis à jour', request: data[0] });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /requests/:requestId ───────────────────────────────────────────────
router.delete('/:requestId', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM demandes WHERE id = $1`,
      [req.params.requestId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json({ message: 'Demande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;