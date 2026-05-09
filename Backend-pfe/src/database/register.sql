CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS citizens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nin            VARCHAR(18) UNIQUE NOT NULL,
  nom            VARCHAR(100) NOT NULL,
  prenom         VARCHAR(100) NOT NULL,
  date_naissance DATE NOT NULL,
  lieu_naissance VARCHAR(100),
  commune        VARCHAR(100) NOT NULL,
  wilaya         VARCHAR(100) NOT NULL DEFAULT 'Oran',
  sexe           CHAR(1) CHECK (sexe IN ('M', 'F')),
  adresse        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- SAFE VIEW (NO NIN)
CREATE OR REPLACE VIEW citizens_safe AS
SELECT 
  id,
  nom,
  prenom,
  commune,
  wilaya,
  sexe
FROM citizens;
-- CNI DOCUMENTS
CREATE TABLE IF NOT EXISTS cni_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      UUID NOT NULL REFERENCES citizens(id) ON DELETE RESTRICT,
  numero_cni      VARCHAR(50) UNIQUE NOT NULL,
  date_emission   DATE NOT NULL,
  date_expiration DATE NOT NULL,
  scan_path       VARCHAR(255),
  registry_path   VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ACTES NAISSANCE
CREATE TABLE IF NOT EXISTS actes_naissance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id          UUID NOT NULL REFERENCES citizens(id) ON DELETE RESTRICT,

  numero_acte         VARCHAR(50) UNIQUE NOT NULL,
  date_acte           DATE NOT NULL,

  heure_naissance     TIME,
  wilaya_naissance    VARCHAR(100) NOT NULL,
  commune_naissance   VARCHAR(100) NOT NULL,

  -- snapshot (intentional)
  nom_prenom          VARCHAR(200) NOT NULL,
  sexe                CHAR(1) CHECK (sexe IN ('M', 'F')),

  pere_nom_prenom     VARCHAR(200),
  pere_age            INT,
  pere_metier         VARCHAR(150),

  mere_nom_prenom     VARCHAR(200),
  mere_age            INT,
  mere_metier         VARCHAR(150),

  domicile_wilaya     VARCHAR(100),
  domicile_commune    VARCHAR(100),

  heure_redaction     TIME,
  notes               TEXT,

  file_name           VARCHAR(255), -- safer than full path
  wilaya_delivrance   VARCHAR(100) DEFAULT 'Oran',
  date_delivrance     DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- INDEXES
CREATE INDEX IF NOT EXISTS idx_citizens_nin ON citizens(nin);
CREATE INDEX IF NOT EXISTS idx_citizens_nom ON citizens(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_cni_citizen ON cni_documents(citizen_id);
CREATE INDEX IF NOT EXISTS idx_acte_citizen ON actes_naissance(citizen_id);

-- TRIGGERS (updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citizens_updated
BEFORE UPDATE ON citizens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_actes_updated
BEFORE UPDATE ON actes_naissance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  table_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- role municipale agent (read only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_role') THEN
    CREATE ROLE agent_role;
  END IF;
END
$$;

-- view
GRANT SELECT ON citizens_safe TO agent_role;
GRANT SELECT ON cni_documents TO agent_role;
GRANT SELECT ON actes_naissance TO agent_role;

REVOKE ALL ON citizens FROM agent_role;

INSERT INTO cni_documents (citizen_id, numero_cni, date_emission, date_expiration, scan_path, registry_path)
SELECT
  id,
  'CNI-2020-001234',
  '2020-01-15',
  '2030-01-15',
  'cni_scan.pdf',
  'cni_registry.pdf'
FROM citizens WHERE nin = '190123456789012'
ON CONFLICT (numero_cni) DO NOTHING;