import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabase } from '../supabaseClient.js';
import sendActivationEmail from '../emails/sendActivation.js';
import sendRejectionEmail from '../emails/sendRejection.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvmruxcjpgovdrwvykyn.supabase.co';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`;

const toStorageUrl = (bucket, path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('C:\\') || path.startsWith('D:\\') ||
    path.startsWith('/Users') || path.startsWith('/home')) {
    return null;
  }
  return `${STORAGE_URL}/${bucket}/${path}`;
};

// ── GET all registration requests ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .order('date_demande', { ascending: false });

    if (error) return res.status(500).json({ error: 'Database fetch failed: ' + error.message });

    const enriched = await Promise.all(requests.map(async (r) => {
      try {
        const cleanNIN = String(r.nin || '').trim();
        const { data: citizen, error: citizenError } = await supabase
          .schema('register')
          .from('citizens')
          .select('*')
          .eq('nin', cleanNIN)
          .maybeSingle();

        return {
          id: r.id,
          firstName: r.prenom,
          lastName: r.nom,
          nin: r.nin,
          email: r.email,
          dob: r.date_demande,
          commune: r.adresse || r.commune || '',
          address: r.adresse || '',
          status: r.status,
          rejectionReason: r.commentaire || '',
          cniRectoPath: toStorageUrl('cni-scans', r.cni_recto_path),
          cniVersoPath: toStorageUrl('cni-scans', r.cni_verso_path),
          selfiePath: toStorageUrl('selfies', r.selfie_path),
          reg: citizen ? {
            firstName: citizen.prenom || citizen.first_name || '',
            lastName: citizen.nom || citizen.last_name || '',
            nin: citizen.nin || '',
            dob: citizen.date_naissance || '',
            commune: citizen.commune || '',
          } : null
        };
      } catch (innerErr) {
        return { ...r, reg: null };
      }
    }));

    res.json({ data: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST validate ─────────────────────────────────────────────────────────
router.post('/:id/validate', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: request, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !request) return res.status(404).json({ error: 'Request not found' });

    const token = crypto.randomBytes(32).toString('hex');

    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'termine',
        activation_token: token,
        date_traitement: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    try {
      await sendActivationEmail(request.email, request.prenom, token);
      res.json({ success: true, message: 'Validated and activation email sent' });
    } catch (emailErr) {
      res.json({ success: true, warning: 'Validated but email failed: ' + emailErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST reject ───────────────────────────────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectionReason = (reason && reason.trim()) ? reason.trim() : 'Your request has been rejected.';

  try {
    const { data: request, error } = await supabase
      .from('demandes_inscription')
      .select('nom, prenom, nin, email')
      .eq('id', id)
      .single();

    if (error || !request) return res.status(404).json({ error: 'Request not found' });

    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'refuse',
        commentaire: rejectionReason,
        date_traitement: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    await sendRejectionEmail(request.email, request.prenom, rejectionReason);
    res.json({ success: true, message: 'Rejection email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET verify-token ──────────────────────────────────────────────────────
router.get('/verify-token', async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ valid: false, error: 'No token provided' });

  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('id, email, prenom, nom, status, activation_token')
      .eq('activation_token', token)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ valid: false, error: 'Lien invalide ou expiré' });
    }

    if (data.status !== 'termine') {
      return res.status(400).json({ valid: false, error: 'Compte déjà activé ou demande non validée' });
    }

    // ✅ FIX: use 'activate' instead of 'active' (which is not in the enum)
    const { error: activateErr } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'activate',   // ✅ was 'active' — not in enum
        activation_token: null
      })
      .eq('id', data.id);

    if (activateErr) throw activateErr;

    res.json({
      valid: true,
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ── GET activate redirect ─────────────────────────────────────────────────
router.get('/activate/:token', async (req, res) => {
  const { token } = req.params;
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  res.redirect(`${frontendUrl}?token=${token}`);
});

// ── POST /activate ────────────────────────────────────────────────────────
router.post('/activate', async (req, res) => {
  const { token, password } = req.body;  // ✅ FIX: receive password

  if (!token) {
    return res.status(400).json({ valid: false, error: 'No token provided' });
  }

  // ✅ FIX: require password
  if (!password) {
    return res.status(400).json({ valid: false, error: 'Mot de passe requis' });
  }

  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('activation_token', token)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ valid: false, error: 'Lien invalide ou expiré' });
    }

    if (data.status !== 'termine' && data.status !== 'activate') {
      return res.status(400).json({ valid: false, error: 'Compte déjà activé ou non validée' });
    }

    // ✅ FIX: hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: existing } = await supabase
      .from('citizens')
      .select('id')
      .eq('nin', data.nin)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from('citizens')
        .insert([{
          email: data.email,
          first_name: data.prenom,
          last_name: data.nom,
          nin: data.nin,
          adresse: data.adresse,
          password_hash: passwordHash,  // ✅ FIX: save hashed password
        }]);

      if (insertError) {
        console.error('Insert citizens error:', insertError);
        throw insertError;
      }
    } else {
      // ✅ FIX: if citizen already exists, update their password
      const { error: updatePwErr } = await supabase
        .from('citizens')
        .update({ password_hash: passwordHash })
        .eq('nin', data.nin);

      if (updatePwErr) throw updatePwErr;
    }

    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'activated',
        activation_token: null,
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    console.log('Citizen activated:', data.email);
    res.json({ valid: true, email: data.email, name: data.prenom });

  } catch (err) {
    console.error('Activate error:', err.message);
    res.status(500).json({ valid: false, error: err.message });
  }
});

export default router;