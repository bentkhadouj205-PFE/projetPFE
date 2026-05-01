import express from 'express';
import * as authController from '../controllers/authController.js';
import { supabase } from '../supabaseClient.js';


const router = express.Router();

// POST /auth/register  — creates row in `users` table
router.post('/register', authController.register);

// POST /auth/login     — checks `users` table (role: citoyen | municipal_agent | employee)
router.post('/login', authController.login);

// GET  /auth/me        — returns current user from `users` table
router.get('/me', authController.getMe);
// routes/authRoutes.js — uses APP db
import pool from '../db.js';

// routes/verifyRoutes.js — uses REGISTRY db
import { registryPool } from '../db.js';

// Compare citizen (like your screenshot)
router.post('/verify', async (req, res) => {
  const { nin } = req.body;

  const submitted = await pool.query(
    'SELECT * FROM demandes WHERE nin = $1', [nin]
  );

  const official = await registryPool.query(
    'SELECT * FROM citizens WHERE nin = $1', [nin]
  );

  res.json({
    submitted: submitted.rows[0],
    official:  official.rows[0]
  });
});

export default router;