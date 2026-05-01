import express from 'express';
import crypto from 'crypto';
import { supabase } from '../supabaseClient.js';
import sendActivationEmail from '../emails/sendActivation.js';
import sendRejectionEmail from '../emails/sendRejection.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();



const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvmruxcjpgovdrwvykyn.supabase.co';

// Helper to build public storage URL
const storageUrl = (bucket, path) => {
  if (!path) return null;
  // If already a full URL, return as-is
  if (path.startsWith('http')) return path;
  // Build public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// ── GET all requests with registry comparison ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('demandes_inscription')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    const enriched = await Promise.all(requests.map(async (r) => {
      // Find matching citizen by NIN
      const { data: citizen } = await supabase
        .from('citizens')
        .select('id, nom, prenom, nin, date_naissance, commune, wilaya')
        .eq('nin', r.nin)
        .maybeSingle();

      return {
        id:              r.id,
        firstName:       r.prenom,
        lastName:        r.nom,
        nin:             r.nin,
        email:           r.email,
        dob:             r.date_naissance,
        commune:         r.commune,
        address:         r.adresse,
        status:          r.status,
        rejectionReason: r.commentaire || r.rejection_reason,
        // ✅ Generate public Supabase Storage URLs
        cniScanPath:     storageUrl('cni-scans', r.cni_recto_path || r.photo_cni_path),
        selfiePath:      storageUrl('selfies',   r.selfie_path || r.photo_domicile_path),
        reg: {
          firstName:  citizen?.prenom          ?? null,
          lastName:   citizen?.nom             ?? null,
          nin:        citizen?.nin             ?? null,
          dob:        citizen?.date_naissance  ?? null,
          commune:    citizen?.commune         ?? null,
        }
      };
    }));

    res.json({ data: enriched }); // Keeping the { data: ... } wrapper to match current frontend
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
    if (request.status !== 'pending' && request.status !== 'en_attente') {
        return res.status(400).json({ error: 'Request already processed' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { error: updateErr } = await supabase
      .from('demandes_inscription')
      .update({ status: 'termine' })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await sendActivationEmail(request.email, request.prenom, token);
    res.json({ success: true, message: 'Activation email sent' });
  } catch (err) {
    console.error('Validate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST reject ───────────────────────────────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason required' });

  try {
    const { data: request, error } = await supabase
      .from('demandes_inscription')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending' && request.status !== 'en_attente') {
        return res.status(400).json({ error: 'Request already processed' });
    }

    const { error: updateErr } = await supabase
      .from('demandes_inscription')
      .update({ status: 'refuse', commentaire: reason })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await sendRejectionEmail(request.email, request.prenom, reason);
    res.json({ success: true, message: 'Rejection email sent' });
  } catch (err) {
    console.error('Reject error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
