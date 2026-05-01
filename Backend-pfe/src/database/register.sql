
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CITIZENS TABLE (SENSITIVE - CONTAINS NIN)
CREATE TABLE IF NOT EXISTS citizens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nin                 VARCHAR(18) UNIQUE NOT NULL,
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    date_naissance      DATE NOT NULL,
    lieu_naissance      VARCHAR(100),
    commune             VARCHAR(100) NOT NULL,
    wilaya              VARCHAR(100) NOT NULL DEFAULT 'Oran',
    sexe                CHAR(1) CHECK (sexe IN ('M', 'F')),
    adresse             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SAFE VIEW FOR READ-ONLY ACCESS (NO NIN)
CREATE OR REPLACE VIEW citizens_safe AS
SELECT 
    id,
    nom,
    prenom,
    commune,
    wilaya,
    sexe,
    date_naissance
FROM citizens;

-- CNI DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS cni_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id          UUID NOT NULL REFERENCES citizens(id) ON DELETE RESTRICT,
    numero_cni          VARCHAR(50) UNIQUE NOT NULL,
    date_emission       DATE NOT NULL,
    date_expiration     DATE NOT NULL,
    scan_path           VARCHAR(255),
    registry_path       VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BIRTH CERTIFICATES TABLE (ACTES DE NAISSANCE)
CREATE TABLE IF NOT EXISTS actes_naissance (
    -- Primary keys
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id          UUID NOT NULL REFERENCES citizens(id) ON DELETE RESTRICT,
    
    -- Certificate numbers
    numero_chahada      VARCHAR(50) UNIQUE,  -- Certificate number
    numero_acte         VARCHAR(50) UNIQUE NOT NULL,  -- Registry number
    
    -- Birth information
    date_naissance      DATE,  -- Birth date
    date_acte           DATE NOT NULL,  -- Act date
    heure_naissance     TIME,
    wilaya_naissance    VARCHAR(100) NOT NULL,
    commune_naissance   VARCHAR(100) NOT NULL,
    
    -- Child information (snapshot)
    nom_prenom          VARCHAR(200) NOT NULL,
    sexe                CHAR(1) CHECK (sexe IN ('M', 'F')),
    
    -- Father information
    pere_nom_prenom     VARCHAR(200),
    pere_age            INT,
    pere_metier         VARCHAR(150),  -- Often empty
    pere_domicile_commune VARCHAR(100),  -- Father's residence commune
    pere_domicile_wilaya  VARCHAR(100),  -- Father's residence wilaya
    
    -- Mother information
    mere_nom_prenom     VARCHAR(200),
    mere_age            INT,
    mere_metier         VARCHAR(150),  -- Often empty
    mere_domicile_commune VARCHAR(100),  -- Mother's residence commune
    mere_domicile_wilaya  VARCHAR(100),  -- Mother's residence wilaya
    
    -- Family residence
    domicile_wilaya     VARCHAR(100),
    domicile_commune    VARCHAR(100),
    
    -- Drafting information
    heure_redaction     TIME,
    redige_le           DATE,  -- Drafting date
    redige_a            VARCHAR(100),  -- Drafting place (commune)
    redige_a_heure      TIME,  -- Drafting time
    
    -- Declaration information
    declare_par         VARCHAR(200),  -- Declarant name
    declare_par_titre   VARCHAR(100),  -- Declarant title
    
    -- Civil registry officer
    officier_etat_civil VARCHAR(200),  -- Officer name
    officier_commune    VARCHAR(100),  -- Officer's commune
    officier_wilaya     VARCHAR(100),  -- Officer's wilaya
    
    -- Marginal notes (complete)
    marginal_notes      TEXT,  -- All marginal notes (marriages, divorces, deaths, etc.)
    
    -- Additional notes and files
    notes               TEXT,
    file_name           VARCHAR(255),
    wilaya_delivrance   VARCHAR(100) DEFAULT 'Oran',
    date_delivrance     DATE,
    
    -- System timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_citizens_nin ON citizens(nin);
CREATE INDEX IF NOT EXISTS idx_citizens_nom ON citizens(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_cni_citizen ON cni_documents(citizen_id);
CREATE INDEX IF NOT EXISTS idx_cni_numero ON cni_documents(numero_cni);
CREATE INDEX IF NOT EXISTS idx_acte_citizen ON actes_naissance(citizen_id);
CREATE INDEX IF NOT EXISTS idx_acte_numero ON actes_naissance(numero_acte);
CREATE INDEX IF NOT EXISTS idx_acte_chahada ON actes_naissance(numero_chahada);
CREATE INDEX IF NOT EXISTS idx_acte_date ON actes_naissance(date_naissance);

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

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    action          TEXT,
    table_name      TEXT,
    record_id       UUID,
    old_data        JSONB,
    new_data        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_role (municipal agent - read only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_role') THEN
        CREATE ROLE agent_role;
    END IF;
END
$$;

-- Create admin_role (full access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role;
    END IF;
END
$$;

-- GRANT READ-ONLY ACCESS TO agent_role
GRANT SELECT ON citizens_safe TO agent_role;
GRANT SELECT ON cni_documents TO agent_role;
GRANT SELECT ON actes_naissance TO agent_role;
-- REVOKE SENSITIVE TABLE ACCESS FROM agent_role
REVOKE ALL ON citizens FROM agent_role;

-- GRANT FULL ACCESS TO admin_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin_role;
-- Safe view for birth certificates (without marginal notes for regular agents)
CREATE OR REPLACE VIEW actes_naissance_safe AS
SELECT 
    id,
    citizen_id,
    numero_chahada,
    numero_acte,
    date_naissance,
    date_acte,
    commune_naissance,
    wilaya_naissance,
    nom_prenom,
    sexe,
    pere_nom_prenom,
    mere_nom_prenom,
    redige_le,
    redige_a,
    officier_etat_civil
    -- marginal_notes is EXCLUDED for privacy
FROM actes_naissance;

-- Grant access to safe views
GRANT SELECT ON actes_naissance_safe TO agent_role;
-- Insert a test citizen
INSERT INTO citizens (nin, nom, prenom, date_naissance, commune, wilaya, sexe, lieu_naissance)
VALUES ('190123456789012', 'بن علي', 'محمد', '1990-01-15', 'سيدي مبروك', 'وهران', 'M', 'وهران')
ON CONFLICT (nin) DO NOTHING;

-- Insert a CNI document
INSERT INTO cni_documents (citizen_id, numero_cni, date_emission, date_expiration, scan_path, registry_path)
SELECT id, 'CNI-2020-001234', '2020-01-15', '2030-01-15', 'cni_scan.pdf', 'cni_registry.pdf'
FROM citizens WHERE nin = '190123456789012'
ON CONFLICT (numero_cni) DO NOTHING;

-- Insert a birth certificate
INSERT INTO actes_naissance (
    citizen_id,
    numero_chahada,
    numero_acte,
    date_naissance,
    date_acte,
    commune_naissance,
    wilaya_naissance,
    nom_prenom,
    sexe,
    pere_nom_prenom,
    mere_nom_prenom,
    redige_a,
    redige_le,
    officier_etat_civil,
    marginal_notes
)
SELECT 
    id,
    'شهادة رقم 2026-001',
    'ACTE-2026-001',
    '2026-03-17',
    '2026-03-17',
    'مستغانم',
    'مستغانم',
    'محمد بن علي',
    'M',
    'علي بن محمد',
    'فاطمة بنت أحمد',
    'مستغانم',
    '2026-03-17',
    'ضابط الحالة المدنية ببلدية مستغانم',
    'البيانات الهامشية: لا شيء'
FROM citizens WHERE nin = '190123456789012'
ON CONFLICT (numero_acte) DO NOTHING;
