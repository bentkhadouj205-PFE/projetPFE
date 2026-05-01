import bcrypt from 'bcrypt';
import pool from '../db.js'; 
export const register = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      nin,
      email,
      adresse,
      codePostal,
      password
    } = req.body;

    console.log('Inscription reçue:', email);

    // Check duplicate email
    const emailCheck = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà utilisé',
        field: 'email'
      });
    }
    // Check duplicate NIN
    const ninCheck = await pool.query(
      `SELECT id FROM users WHERE nin = $1`,
      [nin]
    );

    if (ninCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'NIN déjà utilisé',
        field: 'nin'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const { rows } = await pool.query(
      `INSERT INTO users
        (nom, prenom, nin, email, adresse, code_postal, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'citoyen')
       RETURNING id, nom, prenom, nin, email, adresse, code_postal, role, created_at`,
      [
        nom,
        prenom,
        nin,
        email,
        adresse,
        codePostal,
        password_hash
      ]
    );

    const user = rows[0];

    console.log('Compte créé:', email);

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        adresse: user.adresse,
        codePostal: user.code_postal,
        nin: user.nin,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);

    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return res.status(400).json({
          success: false,
          message: 'Email déjà utilisé',
          field: 'email'
        });
      }

      if (error.constraint?.includes('nin')) {
        return res.status(400).json({
          success: false,
          message: 'NIN déjà utilisé',
          field: 'nin'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Donnée déjà utilisée'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Tentative connexion:', email);

    const { rows } = await pool.query(
      `SELECT id, nom, prenom, nin, email, adresse, code_postal,
              password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email non trouvé'
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    console.log('Connexion réussie:', email);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        adresse: user.adresse,
        codePostal: user.code_postal,
        nin: user.nin,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};
// GET ME
export const getMe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    const { rows } = await pool.query(
      `SELECT id, nom, prenom, nin, email, adresse, code_postal, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const user = rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        adresse: user.adresse,
        codePostal: user.code_postal,
        nin: user.nin,
        role: user.role,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Erreur getMe:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};