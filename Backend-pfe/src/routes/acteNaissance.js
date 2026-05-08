import express from 'express';
import { supabase } from '../supabaseClient.js';
import PDFService from '../server/pdfservice.js';

const router = express.Router();

// Generate PDF for a specific birth certificate
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: acteData, error } = await supabase
      .schema('register')
      .from('actes_naissance')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !acteData) {
      return res.status(404).json({ error: 'Certificat de naissance not found' });
    }
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateActeNaissance(acteData);
    
    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificat_naissance_${acteData.numero_acte || acteData.numero_chahada}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF by numero_acte
router.get('/numero/:numero/pdf', async (req, res) => {
  try {
    const { numero } = req.params;
    
    const { data: acteData, error } = await supabase
      .schema('register')
      .from('actes_naissance')
      .select('*')
      .or(`numero_acte.eq.${numero},numero_chahada.eq.${numero}`)
      .limit(1)
      .single();
    
    if (error || !acteData) {
      return res.status(404).json({ error: 'Certificat de naissance not found' });
    }
    
    const pdfBuffer = await PDFService.generateActeNaissance(acteData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificat_naissance_${numero}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
