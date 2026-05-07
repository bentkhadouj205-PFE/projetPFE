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
       FROM citizens
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

// ─────────────────────────────────────────────────────────────
// REGISTER EMPLOYEE (done by admin)
// ─────────────────────────────────────────────────────────────
export const registerEmployee = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      service,
      position,
      join_date,
      status,
      user_id
    } = req.body;

    // Check duplicate email
    const emailCheck = await pool.query(
      `SELECT id FROM employees WHERE email = $1`,
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà utilisé',
        field: 'email'
      });
    }

    // ✅ bcrypt يولد salt مختلف تلقائياً لكل موظف
    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO employees
        (email, password_hash, first_name, last_name, role, service, position, join_date, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, first_name, last_name, role, service, position, join_date, status`,
      [email, password_hash, first_name, last_name, role, service, position, join_date, status, user_id]
    );

    res.status(201).json({
      success: true,
      message: 'Employé créé avec succès',
      employee: rows[0]
    });

  } catch (error) {
    console.error('Erreur register employee:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────────────────────
// LOGIN EMPLOYEE
// ─────────────────────────────────────────────────────────────
export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, service, position, status
       FROM employees
       WHERE email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email non trouvé'
      });
    }

    const employee = rows[0];

    // ✅ bcrypt.compare يستخرج الـ salt من الهاش تلقائياً
    const isMatch = await bcrypt.compare(password, employee.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    res.json({
      success: true,
      message: 'Connexion réussie',
      employee: {
        id: employee.id,
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
        service: employee.service,
        position: employee.position,
        status: employee.status
      }
    });

  } catch (error) {
    console.error('Erreur login employee:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};