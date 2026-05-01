import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from '../supabaseClient.js';

import { io } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── Multer config ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/inscriptions');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET /demandes (all demandes) ──────────────────────────────────────────────
router.get('/demandes', async (req, res) => {
  const { type } = req.query;

  let query = supabase.from('demandes_inscription').select('*');
  if (type) {
    query = query.eq('type_document', type);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json(error);

  // Normalize paths: Robust conversion of absolute/Windows paths to relative web paths
  const normalizedData = data.map(item => {
    const newItem = { ...item };
    const pathKeys = ['cni_recto_path', 'cni_verso_path', 'selfie_path', 'photo_cni_path', 'photo_domicile_path'];
    
    pathKeys.forEach(key => {
      if (typeof newItem[key] === 'string' && newItem[key].length > 0) {
        // Find 'uploads' in the path and get everything after it
        const uploadsIndex = newItem[key].toLowerCase().indexOf('uploads');
        if (uploadsIndex !== -1) {
          newItem[key] = '/' + newItem[key].substring(uploadsIndex).replace(/\\/g, '/');
        } else if (!newItem[key].startsWith('/')) {
          // If it's just a filename, assume it's in inscriptions
          newItem[key] = '/uploads/inscriptions/' + newItem[key];
        }
      }
    });
    return newItem;
  });

  res.json({ data: normalizedData });
});

// ── POST /demandes/certificat-residence ──────────────────────────────────────
router.post(
  '/certificat-residence',
  upload.fields([
    { name: 'photo_cni', maxCount: 1 },
    { name: 'photo_domicile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { user_id, nom, prenom, nin, date_demande } = req.body;

      if (!user_id || !nom || !prenom || !nin) {
        return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
      }

      // CORRECT: Save ONLY the relative path using the exact logic requested
      const fileUrl1 = `/uploads/inscriptions/${req.files.photo_cni[0].filename}`;
      const fileUrl2 = `/uploads/inscriptions/${req.files.photo_domicile[0].filename}`;

      const { data, error } = await supabase
        .from('demandes_inscription')
        .insert([
          {
            user_id,
            type_document: 'certificat_residence',
            nom,
            prenom,
            nin,
            cni_recto_path: fileUrl1,
            selfie_path: fileUrl2,
            date_demande: date_demande || new Date(),
            status: 'pending'
          }
        ])
        .select('id');

      if (error) throw error;

      //  Real-time notification
      const newDemande = {
        id: data[0].id,
        user_id,
        type_document: 'certificat_residence',
        nom,
        prenom,
        nin,
        cni_recto_path: fileUrl1,
        selfie_path: fileUrl2,
        date_demande: date_demande || new Date(),
        status: 'pending'
      };
      io.to('agents_room').emit('new_demande', newDemande);

      res.status(201).json({ success: true, demandeId: data[0].id });
    } catch (error) {
      console.error('Erreur certificat-residence:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;