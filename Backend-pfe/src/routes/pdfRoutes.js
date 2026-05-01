// routes/pdfRoutes.js
import express          from 'express';
import pool             from '../db.js';
import { registryPool } from '../db.js';
import PDFService from '../server/pdfservice.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

function sendPDF(res, buffer, filename) {
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length':      buffer.length,
  });
  res.send(buffer);
}
router.get('/request/:requestId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM requests WHERE id = $1',
      [req.params.requestId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Demande non trouvée' });

    const buffer = await PDFService.generateCitizenPDF(rows[0]);
    sendPDF(res, buffer, `demande_${req.params.requestId}.pdf`);
  } catch (err) {
    console.error('PDF request error:', err.message);
    res.status(500).json({ message: 'Erreur génération PDF' });
  }
});
router.get('/acte-naissance/:nin', async (req, res) => {
  try {
    const { nin } = req.params;

    const { rows } = await registryPool.query(
      `SELECT c.*, a.*
       FROM citizens c
       LEFT JOIN actes_naissance a ON a.citizen_id = c.id
       WHERE c.nin = $1
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [nin]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Citoyen non trouvé dans le registre' });
    }

    const buffer = await PDFService.generateActeNaissance(rows[0]);
    sendPDF(res, buffer, `acte_naissance_${nin}.pdf`);

  } catch (err) {
    console.error('PDF acte-naissance error:', err.message);
    res.status(500).json({ message: 'Erreur génération PDF' });
  }
});
router.get('/carte-sejour/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { rows } = await pool.query(
      `SELECT u.nom, u.prenom, u.adresse, u.metier,
              d.commune, d.date_naissance
       FROM users u
       LEFT JOIN demandes d ON d.user_id = u.id
       WHERE u.id = $1
       ORDER BY d.date_demande DESC
       LIMIT 1`,
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const buffer = await PDFService.generateCarteSejour(rows[0]);
    sendPDF(res, buffer, `carte_sejour_${userId}.pdf`);

  } catch (err) {
    console.error('PDF carte-sejour error:', err.message);
    res.status(500).json({ message: 'Erreur génération PDF' });
  }
});

export default router;