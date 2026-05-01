import express from 'express';
import emailjs from '@emailjs/nodejs';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

const MUNICIPAL_AGENT_CREDENTIALS = {
  email: 'municipal_agent@gmail.com',
  password: 'municipalagent123',
  id: '00000000-0000-0000-0000-000000000001'
};

// POST /municipal_agent/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanEmail !== MUNICIPAL_AGENT_CREDENTIALS.email) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    if (cleanPassword !== MUNICIPAL_AGENT_CREDENTIALS.password) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    console.log('Municipal_Agent connecté');
    res.json({
      message: 'Connexion Municipal_Agent réussie',
      user: {
        id: MUNICIPAL_AGENT_CREDENTIALS.id,
        email: MUNICIPAL_AGENT_CREDENTIALS.email,
        firstName: 'Municipal_Agent',
        name: 'Municipal_Agent',
        role: 'municipal_agent',
        service: 'Administration Système',
        position: 'Administrateur Système',
        phone: '',
        joinDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur login Municipal_Agent:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/employees — list all employees
router.get('/employees', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    console.log(`Municipal_Agent: ${data.length} employés trouvés`);
    res.json({ count: data.length, employees: data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/employees/:id
router.get('/employees/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ message: 'Employé non trouvé' });
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/all-requests — each row includes `reg` from registry DB matched by citizen_nin
router.get('/all-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .order('date_demande', { ascending: false });

    if (error) throw error;

    // Registry matching logic remains similar but uses Supabase for the registry too if applicable
    // For now, keeping it simple as we are transitioning the main app to Supabase
    const requests = data.map((r) => ({
      ...r,
      reg: null // Simplified for now
    }));

    console.log(`Municipal_Agent: ${requests.length} demandes trouvées`);
    res.json({ count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/requests/:id
router.get('/requests/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ message: 'Demande non trouvée' });
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('status');

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    const stats = {
      total: data.length,
      pending: data.filter(d => d.status === 'pending').length,
      in_progress: data.filter(d => d.status === 'in_progress').length,
      completed: data.filter(d => d.status === 'completed').length,
      rejected: data.filter(d => d.status === 'rejected').length,
    };

    console.log("SUPABASE STATS:", stats);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /admin/requests/:id/status
router.put('/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    // 🗺️ Professional Status Mapping
    const statusMap = {
      pending: "en_attente",
      in_progress: "en_cours",
      rejected: "refuse",
      validated: "termine",
    };

    const dbStatus = statusMap[status] || status; 

    // 🛡️ 1. Strict Enum Validation
    const allowedStatuses = ["en_attente", "en_cours", "refuse", "termine"];
    if (!allowedStatuses.includes(dbStatus)) {
      return res.status(400).json({ error: `Statut invalide.` });
    }

    // 🛡️ 2. Fetch Current State
    const { data: currentRecord, error: fetchError } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRecord) return res.status(404).json({ error: 'Demande non trouvée' });

    // 🛡️ 3. Perform Update (and generate token if validated)
    const updateData = {
      status: dbStatus,
      comment: comment || undefined,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('demandes_inscription')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 🛡️ 4. Trigger Email via EmailJS
    const targetEmail = data.email || data.citizen_email;
    const firstName = data.prenom || '';
    const lastName = data.nom || '';

    if (targetEmail) {
      console.log('📧 Starting email send process...');
      console.log('📧 Target Email:', targetEmail);
      
      const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'SERVICE_ID';
      const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'TEMPLATE_ID';
      const TEMPLATE_ID_REJECT = process.env.EMAILJS_TEMPLATE_ID_REJECT || 'TEMPLATE_ID_REJECT';
      const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'PUBLIC_KEY';

      try {
        console.log('📧 Attempting to send via EmailJS...');
        if (dbStatus === 'termine') {
          const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-account?token=${id}`;
          
          await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            {
              to_email: targetEmail,
              nom: lastName,
              prenom: firstName,
              verification_link: verificationLink,
            },
            {
              publicKey: PUBLIC_KEY,
              privateKey: process.env.EMAILJS_PRIVATE_KEY // Optional depending on EmailJS settings
            }
          );
          console.log(`✅ Activation email sent via EmailJS to ${targetEmail}`);
        } else if (dbStatus === 'refuse') {
          await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID_REJECT,
            {
              to_email: targetEmail,
              nom: lastName,
              prenom: firstName,
              commentaire: comment || 'Les informations ne correspondent pas.',
            },
            {
              publicKey: PUBLIC_KEY,
              privateKey: process.env.EMAILJS_PRIVATE_KEY
            }
          );
          console.log(`❌ Rejection email sent via EmailJS to ${targetEmail}`);
        }
      } catch (emailError) {
        console.error('❌ EMAIL ERROR:', emailError);
        console.error('❌ EMAIL ERROR STRING:', JSON.stringify(emailError, null, 2));
        // We don't throw the error so the status update still succeeds in the dashboard
      }
    }

    return res.json({ success: true, message: 'Traitement terminé', request: data });
  } catch (error) {
    console.error("💥 ADMIN STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/requests/:id
router.delete('/requests/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('demandes_inscription')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Demande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/verify-email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', token)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Token invalide' });

    // Mark email as verified
    await supabase
      .from('demandes_inscription')
      .update({ email_verified: true })
      .eq('id', token);

    return res.json({ 
      success: true, 
      name: `${data.prenom} ${data.nom}` 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;