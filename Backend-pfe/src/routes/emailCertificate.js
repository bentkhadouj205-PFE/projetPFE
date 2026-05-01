import express from 'express';
import multer from 'multer';
import { emailService, transporter, generateCertificatePDF } from './emailServices.js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

router.post('/generate-pdf', async (req, res) => {
  console.log(" PDF REQUEST RECEIVED");
  try {
    const data = req.body;
    const pdfBuffer = await generateCertificatePDF(data);
    const base64PDF = Buffer.from(pdfBuffer).toString('base64');
    res.json({ success: true, pdfBase64: base64PDF });
  } catch (err) {
    console.error(" PDF GENERATION FAILED:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-and-send', async (req, res) => {
  console.log(" RECEIVED REQUEST ON /api/email/generate-and-send");
  try {
    const { citizenEmail, citizenFirstName, requestSubject, ...data } = req.body;

    console.log("Generating PDF for:", citizenFirstName);

    console.log("  Generating PDF with Puppeteer...");
    const pdfBuffer = await generateCertificatePDF({
      fullName: `${citizenFirstName} ${data.lastName || ''}`,
      ...data
    });
    console.log(" PDF Buffer created successfully (" + pdfBuffer.length + " bytes)");

    console.log("Handing over to Email Service...");
    const info = await emailService.sendValidationEmailWithPDF(
      citizenEmail,
      citizenFirstName,
      requestSubject || 'Acte de Naissance',
      'completed',
      'Service État Civil',
      'Votre document est prêt.',
      pdfBuffer
    );

    console.log(" All done!");
    res.json({ success: true, messageId: info?.messageId || 'sent' });
  } catch (err) {
    console.error(" GENERATE-AND-SEND CRASHED AT STEP:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/ultimate-test
// Isolated test ignoring database
router.get('/ultimate-test', async (req, res) => {
  try {
    const to = "bentalebkhadidja1@gmail.com";
    const subject = "TEST GMAIL SMTP";
    const text = "WORKING?";

    const info = await transporter.sendMail({
      from: (process.env.SMTP_USER || '').trim(),
      to,
      subject,
      text,
    });
    console.log("Ultimate test SUCCESS (Gmail)");
    res.json({ success: true, method: 'Gmail', messageId: info.messageId });
  } catch (err) {
    console.error("Ultimate test ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/test-email/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;

    const { data: citizen, error } = await supabase
      .from('users')
      .select('email, nom, prenom')
      .eq('id', citizenId)
      .single();

    if (error || !citizen) {
      return res.status(404).json({ error: 'Citizen not found' });
    }

    const info = await transporter.sendMail({
      from: `"Baladiya Digital" <${(process.env.SMTP_USER || '').trim()}>`,
      replyTo: (process.env.SMTP_USER || '').trim(),
      to: (citizen.email || '').trim(),
      subject: 'Votre acte de naissance est prêt',
      text: `Bonjour ${citizen.prenom} ${citizen.nom}, votre acte de naissance est prêt et disponible.`,
    });

    console.log(`Test email sent to ${citizen.email} | ID: ${info.messageId}`);
    res.json({ success: true, sentTo: citizen.email, messageId: info.messageId });

  } catch (err) {
    console.error('test-email error:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/citizens', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, nom, prenom, role')
      .eq('role', 'citizen');

    if (error) throw error;
    res.json({ count: data.length, citizens: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use memory storage — no disk writes needed
const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage for "Boite Message PFE"
const boiteMessagePFE = new Map();

// POST /api/email/send-certificate (multipart/form-data)
router.post('/send-certificate', upload.single('file'), async (req, res) => {
  try {
    const {
      citizenEmail,
      citizenFirstName,
      requestSubject,
      filename,
      saveToBox,
      boxName,
      certificateData,
    } = req.body;

    console.log("===== SEND-CERTIFICATE DEBUG =====");
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("FILE:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
    console.log("SENDING TO:", citizenEmail);
    console.log("SMTP_USER:", process.env.SMTP_USER);

    if (!citizenEmail || !req.file) {
      return res.status(400).json({ error: 'Email and PDF file required' });
    }
    await transporter.verify();
    console.log("SMTP VERIFIED OK");

    // req.file.buffer is the PDF binary — pass directly to nodemailer
    const info = await emailService.sendValidationEmailWithPDF(
      (citizenEmail || '').trim(),
      citizenFirstName,
      requestSubject,
      'completed',
      'Service État Civil',
      'Votre acte de naissance est prêt.',
      req.file.buffer
    );

    console.log("SUCCESS:", info?.statusCode || info?.messageId || 'sent');
    console.log("==================================");

    const messageId = info?.messageId || `sendgrid-${Date.now()}`;

    // Save to "Boite Message PFE" if requested
    let savedRecord = null;
    if (saveToBox === 'true' && boxName) {
      const certData = certificateData ? JSON.parse(certificateData) : {};
      savedRecord = {
        id: uuidv4(),
        messageId,
        boxName,
        to: citizenEmail,
        subject: requestSubject || `Acte de Naissance - ${citizenFirstName}`,
        filename: filename || req.file.originalname,
        certificateData: certData,
        sentAt: new Date().toISOString(),
        status: 'sent',
        preview: `Acte de naissance envoyé à ${citizenEmail}`,
      };

      if (!boiteMessagePFE.has(boxName)) {
        boiteMessagePFE.set(boxName, []);
      }
      boiteMessagePFE.get(boxName).push(savedRecord);
      console.log('Saved to Boite Message PFE:', savedRecord.id);
    }

    res.json({
      success: true,
      messageId: info?.messageId || messageId,
      savedToBox: !!savedRecord,
      recordId: savedRecord?.id,
    });

  } catch (error) {

    console.error('===== SEND-CERTIFICATE ERROR =====');
    console.error('FULL ERROR:', error);
    console.error('==================================');
    res.status(500).json({
      error: error.message || 'Failed to send certificate',
    });
  }
});

// GET /api/email/boite/:boxName
router.get('/boite/:boxName', (req, res) => {
  const { boxName } = req.params;
  const messages = boiteMessagePFE.get(boxName) || [];
  res.json({
    boxName,
    count: messages.length,
    messages: messages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)),
  });
});

// GET /api/email/boite/:boxName/:messageId
router.get('/boite/:boxName/:messageId', (req, res) => {
  const { boxName, messageId } = req.params;
  const messages = boiteMessagePFE.get(boxName) || [];
  const message = messages.find(m => m.id === messageId);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  res.json(message);
});

// DELETE /api/email/boite/:boxName/:messageId
router.delete('/boite/:boxName/:messageId', (req, res) => {
  const { boxName, messageId } = req.params;
  const messages = boiteMessagePFE.get(boxName) || [];
  const filtered = messages.filter(m => m.id !== messageId);
  boiteMessagePFE.set(boxName, filtered);
  res.json({ success: true, removed: messages.length - filtered.length });
});

export default router;
