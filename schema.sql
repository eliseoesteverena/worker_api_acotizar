-- 1. PLANS
CREATE TABLE plans (
  id   TEXT PRIMARY KEY,  -- 'free' | 'plus'
  name TEXT NOT NULL
);

INSERT INTO plans (id, name) VALUES
  ('free', 'Free'),
  ('plus', 'Plus');


-- 2. LIMITS_PLAN
CREATE TABLE limits_plan (
  id                        TEXT PRIMARY KEY,
  plan_id                   TEXT NOT NULL REFERENCES plans(id),
  quote_persistence_limit   INTEGER,        -- NULL = ilimitado
  export_options            TEXT NOT NULL,  -- 'image' | 'full'
  links_quotes              INTEGER NOT NULL DEFAULT 0  -- 0=false, 1=true (SQLite no tiene BOOLEAN)
);

INSERT INTO limits_plan (id, plan_id, quote_persistence_limit, export_options, links_quotes) VALUES
  ('limits_free', 'free', 5,    'image', 0),
  ('limits_plus', 'plus', NULL, 'full',  1);


-- 3. PROFILES
CREATE TABLE profiles (
  id         TEXT PRIMARY KEY,  -- auth0 sub: "auth0|abc123"
  email      TEXT NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  plan_id    TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);


-- 4. COMPANY
CREATE TABLE company (
  id          TEXT PRIMARY KEY,  -- uuid v4
  name        TEXT NOT NULL,     -- nombre comercial
  fiscal_data TEXT NOT NULL,     -- JSON (ver nota abajo)
  logo_url    TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- fiscal_data JSON shape:
-- {
--   "legal_name":   "Razón Social S.A.",
--   "tax_id":       "20-12345678-9",      ← CUIT / RUT / NIF / etc.
--   "tax_id_type":  "CUIT",               ← tipo de identificador
--   "tax_condition": "Responsable Inscripto",
--   "address": {
--     "street":   "Av. Corrientes 1234",
--     "city":     "Buenos Aires",
--     "province": "CABA",
--     "country":  "AR",
--     "zip":      "C1043"
--   },
--   "phone":   "+54 11 1234-5678",
--   "website": "https://empresa.com"
-- }


-- 5. PROFILE_COMPANY
CREATE TABLE profile_company (
  id         TEXT PRIMARY KEY,  -- uuid v4
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES company(id)  ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner',  -- por si se expande a miembros de equipo
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(profile_id, company_id)
);

CREATE INDEX idx_profile_company_profile ON profile_company(profile_id);
CREATE INDEX idx_profile_company_company ON profile_company(company_id);


-- 6. QUOTES
CREATE TABLE quotes (
  id              TEXT PRIMARY KEY,            -- uuid v4
  profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      TEXT NOT NULL REFERENCES company(id),
  number          INTEGER NOT NULL,            -- correlativo por perfil+empresa
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | sent | accepted | rejected
  currency        TEXT NOT NULL DEFAULT 'ARS', -- ISO 4217: ARS, USD, EUR...
  link            INTEGER NOT NULL DEFAULT 0,  -- 0=privado, 1=público (solo si plan lo permite)
  data            TEXT NOT NULL,               -- JSON (ver nota abajo)
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(profile_id, company_id, number)       -- garantiza correlativo único por perfil+empresa
);

-- data JSON shape:
-- {
--   "title":        "Cotización trabajos de pintura",
--   "client": {
--     "name":       "Cliente S.R.L.",
--     "email":      "contacto@cliente.com",
--     "tax_id":     "30-98765432-1"
--   },
--   "items": [
--     {
--       "id":          "uuid-item",
--       "description": "Pintura exterior 20L",
--       "quantity":    3,
--       "unit":        "unidad",
--       "unit_price":  15000,
--       "total":       45000
--     }
--   ],
--   "subtotal":  45000,
--   "taxes": [
--     { "label": "IVA 21%", "amount": 9450 }
--   ],
--   "total":     54450,
--   "notes":     "Validez de la oferta: 15 días."
-- }

CREATE INDEX idx_quotes_profile    ON quotes(profile_id);
CREATE INDEX idx_quotes_company    ON quotes(company_id);
CREATE INDEX idx_quotes_profile_co ON quotes(profile_id, company_id);  -- para el correlativo