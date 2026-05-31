-- Active: Supabase PostgreSQL Schema

-- ── 1. TYPES & ENUMS ─────────────────────────────────────────────────────────

CREATE TYPE employee_role     AS ENUM ('municipal_agent', 'employee');
CREATE TYPE employee_status   AS ENUM ('active', 'inactive');
CREATE TYPE document_type     AS ENUM ('extrait_naissance', 'carte_sejour', 'certificat_residence', 'contrat_mariage', 'authorisation_de_voirie');
CREATE TYPE demande_status    AS ENUM ('en_attente', 'en_cours', 'termine', 'refuse');

-- ── 2. TABLES ────────────────────────────────────────────────────────────────

-- Profils citoyens activés
CREATE TABLE citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nin VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    adresse TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employés et agents municipaux
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role employee_role NOT NULL DEFAULT 'employee',
    service VARCHAR(150),
    position VARCHAR(150),
    join_date DATE,
    status employee_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demandes d'inscription (création de compte citoyen)
CREATE TABLE demandes_inscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    nin VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    adresse TEXT NOT NULL,
    status demande_status NOT NULL DEFAULT 'en_attente',
    commentaire TEXT,
    cni_recto_path VARCHAR(500),
    cni_verso_path VARCHAR(500),
    selfie_path VARCHAR(500),
    activation_token VARCHAR(255),
    date_demande TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_traitement TIMESTAMPTZ
);

-- Demandes de documents administratifs
CREATE TABLE demandes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    type_document document_type NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nin VARCHAR(20) NOT NULL,
    wilaya_naissance VARCHAR(100),
    commune VARCHAR(100),
    date_naissance DATE,
    photo_cni_path VARCHAR(500),
    photo_domicile_path VARCHAR(500),
    status demande_status NOT NULL DEFAULT 'en_attente',
    date_demande TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_traitement TIMESTAMPTZ,
    date_expiration TIMESTAMPTZ,
    commentaire TEXT,
    assigned_to UUID REFERENCES employees (id) ON DELETE SET NULL
);

-- ── 3. INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX idx_demandes_nin ON demandes (nin);
CREATE INDEX idx_demandes_status ON demandes (status);
CREATE INDEX idx_demandes_date ON demandes (date_demande DESC);
CREATE INDEX idx_citizens_nin ON citizens (nin);
CREATE INDEX idx_employees_email ON employees (email);
CREATE INDEX idx_demandes_inscription_nin ON demandes_inscription (nin);

-- ── 4. TRIGGERS & FUNCTIONS ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citizens_updated_at
  BEFORE UPDATE ON citizens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();