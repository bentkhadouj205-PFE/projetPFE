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

// Build storage URL — handles both Supabase paths and local paths
const toStorageUrl = (bucket, path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;                    // already full URL
  if (path.startsWith('C:\\') || path.startsWith('D:\\') ||
    path.startsWith('/Users') || path.startsWith('/home')) {
    return null;                                               // local path — can't serve
  }
  return `${STORAGE_URL}/${bucket}/${path}`;
};

// ── GET all registration requests ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    console.log(' [VALIDATION] GET / hit. Fetching requests...');
    const { data: requests, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .order('date_demande', { ascending: false });

    if (error) {
      console.error(' [VALIDATION] Supabase fetch error:', error.message);
      return res.status(500).json({ error: 'Database fetch failed: ' + error.message });
    }

    console.log(` [VALIDATION] Found ${requests?.length || 0} requests. Enriching...`);

    const enriched = await Promise.all(requests.map(async (r) => {
      try {
        const cleanNIN = String(r.nin || '').trim();
        console.log(` [VALIDATION] Looking up citizen for NIN: "${cleanNIN}"`);

        // Find matching citizen in register.citizens by NIN
        const { data: citizen, error: citizenError } = await supabase
          .schema('register')
          .from('citizens')
          .select('*')
          .eq('nin', cleanNIN)
          .maybeSingle();

        if (citizenError) {
          console.error(` [VALIDATION] Database Error for NIN ${cleanNIN}:`, citizenError.message);
        } else {
          console.log(` [VALIDATION] Registry result for ${cleanNIN}:`, citizen ? 'FOUND' : 'NOT FOUND');
        }

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
        console.error(' [VALIDATION] Error enriching request for NIN ' + r.nin + ':', innerErr.message);
        return { ...r, reg: null };
      }
    }));

    console.log(' [VALIDATION] Enrichment complete. Sending response.');
    res.json({ data: enriched });
  } catch (err) {
    console.error(' Validation route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST validate — sends activation email ────────────────────────────────
router.post('/:id/validate', async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`[VALIDATE] Processing ID: ${id}`);
    const { data: request, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Save token to DB FIRST
    console.log(` [VALIDATE] Saving token to DB for ID: ${id}`);
    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'termine',
        activation_token: token,
        date_traitement: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error(' [VALIDATE] DB update error:', updateError.message);
      return res.status(500).json({ error: updateError.message });
    }

    // Then try to send email — don't fail if email fails
    try {
      await sendActivationEmail(request.email, request.prenom, token);
      res.json({ success: true, message: 'Validated and activation email sent' });
    } catch (emailErr) {
      console.error(' [VALIDATE] Email error:', emailErr.message);
      // DB already updated — just warn about email
      res.json({
        success: true,
        warning: 'Validated but email failed: ' + emailErr.message
      });
    }
  } catch (err) {
    console.error(' Validate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST reject — sends rejection email ───────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectionReason = (reason && reason.trim())
    ? reason.trim()
    : 'Your request has been rejected.';


  try {
    const { data: request, error } = await supabase
      .from('demandes_inscription')
      .select('nom, prenom, nin, email')
      .eq('id', id)
      .single();

    if (error || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update status + save reason
    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        status: 'refuse',
        commentaire: rejectionReason,
        date_traitement: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error(' Update error:', updateError.message);
      return res.status(500).json({ error: updateError.message });
    }

    // Send rejection email
    await sendRejectionEmail(request.email, request.prenom, rejectionReason);

    res.json({ success: true, message: 'Rejection email sent' });
  } catch (err) {
    console.error('Reject error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET verify-token — called by frontend/mobile after clicking link ──────
router.get('/verify-token', async (req, res) => {
  const { token } = req.query;
  console.log(' [VERIFY-TOKEN] Received token:', token);

  if (!token) {
    return res.status(400).json({ valid: false, error: 'No token provided' });
  }

  try {
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('id, email, prenom, nom, status, activation_token')
      .eq('activation_token', token)
      .maybeSingle();

    console.log('[VERIFY-TOKEN] DB result:', data ? { ...data, activation_token: '***' } : 'No record found');
    if (error) console.log(' [VERIFY-TOKEN] DB error:', error);

    if (error || !data) {
      console.log('[VERIFY-TOKEN] Token not found or invalid');
      return res.status(404).json({ valid: false, error: 'Lien invalide ou expiré' });
    }

    if (data.status !== 'termine') {
      console.log(` [VERIFY-TOKEN] Status mismatch. Found: ${data.status}, Expected: termine`);
      return res.status(400).json({ valid: false, error: 'Compte déjà activé ou demande non validée' });
    }

    // Do not update the database here. We just want to check if the token is valid
    // so we can show the Set Password form.

    console.log(` [VERIFY-TOKEN] Success for: ${data.email}`);
    res.json({
      valid: true,
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
    });
  } catch (err) {
    console.error(' Verify token error:', err.message);
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ── GET activate (Alternative GET link support) ──────────────────────────
router.get('/activate/:token', async (req, res) => {
  const { token } = req.params;
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  res.redirect(`${frontendUrl}?token=${token}`);
});

// ─── POST /activate — Called by VerificationSuccess.tsx ────────────────────
router.post('/activate', async (req, res) => {
  //Receive both the activation token AND the citizen's chosen password
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, error: 'No token provided' });
  }

  //  Require a password before doing anything else
  if (!password || password.trim().length < 6) {
    return res.status(400).json({ valid: false, error: 'Mot de passe requis (minimum 6 caractères)' });
  }

  try {
    // 1. Find the request using the token
    const { data, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('activation_token', token)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ valid: false, error: 'Lien invalide ou expiré' });
    }

    // 2. Make sure the agent has validated this request
    if (data.status !== 'termine') {
      return res.status(400).json({ valid: false, error: 'Compte déjà activé ou non validée' });
    }

    // Hash the password BEFORE inserting into citizens
    const passwordHash = await bcrypt.hash(password.trim(), 10);

    const { data: existing } = await supabase
      .from('citizens')
      .select('id')
      .eq('nin', data.nin)
      .maybeSingle();

    if (!existing) {
      // Insert citizen WITH password_hash so login works
      const { error: insertError } = await supabase
        .from('citizens')
        .insert([{
          email: data.email,
          first_name: data.prenom,
          last_name: data.nom,
          nin: data.nin,
          adresse: data.adresse,
          password_hash: passwordHash,   // FIXED: password saved here
        }]);

      if (insertError) {
        console.error(' Insert citizens error:', insertError);
        throw insertError;
      }
    } else {
      // Citizen row already exists — update the password hash
      const { error: updatePwErr } = await supabase
        .from('citizens')
        .update({ password_hash: passwordHash })
        .eq('nin', data.nin);

      if (updatePwErr) {
        console.error(' Update password error:', updatePwErr);
        throw updatePwErr;
      }
    }

    const { error: updateError } = await supabase
      .from('demandes_inscription')
      .update({
        // keep status as 'termine', just clear the token
        activation_token: null,
      })
      .eq('id', data.id);

    if (updateError) {
      console.error(' Update status error:', updateError);
      throw updateError;
    }

    console.log(' Citizen activated:', data.email);
    res.json({ valid: true, email: data.email, name: data.prenom });

  } catch (err) {
    console.error('Activate error:', err.message);
    res.status(500).json({ valid: false, error: err.message });
  }
});


export default router;
