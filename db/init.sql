-- ═══════════════════════════════════════════════════════════════════════════
-- BhoomiSync / Land Stack — PostgreSQL + PostGIS Init Script
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM Types ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE land_use_enum AS ENUM ('Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ownership_type_enum AS ENUM ('Freehold', 'Leasehold', 'Government', 'Trust');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE tax_status_enum AS ENUM ('Paid', 'Defaulter', 'Partial', 'Exempt');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE utility_type_enum AS ENUM ('Electricity', 'Water');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE utility_status_enum AS ENUM ('Active', 'Inactive', 'Disconnected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE conflict_severity_enum AS ENUM ('High', 'Medium', 'Low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── TABLE: parcels (Core land parcel registry) ───────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ulpin       VARCHAR(14) UNIQUE NOT NULL,
    plot_number VARCHAR(50) NOT NULL,
    geometry    GEOMETRY(POLYGON, 4326) NOT NULL,
    area_sqm    FLOAT NOT NULL,
    land_use    land_use_enum NOT NULL DEFAULT 'Residential',
    ward_name   VARCHAR(100),
    district    VARCHAR(100) DEFAULT 'Bengaluru Urban',
    state       VARCHAR(100) DEFAULT 'Karnataka',
    address     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index on geometry for tile queries
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST (geometry);
-- Index for ULPIN lookup
CREATE INDEX IF NOT EXISTS idx_parcels_ulpin ON parcels (ulpin);
-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_parcels_address_trgm ON parcels USING GIN (address gin_trgm_ops);

-- ─── TABLE: owners (Record of Rights / ownership history) ─────────────────────
CREATE TABLE IF NOT EXISTS owners (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id      UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    owner_name     VARCHAR(200) NOT NULL,
    ownership_type ownership_type_enum NOT NULL DEFAULT 'Freehold',
    owner_aadhar   VARCHAR(12),  -- last 4 digits only for display
    contact_phone  VARCHAR(15),
    survey_number  VARCHAR(50),
    valid_from     DATE NOT NULL,
    valid_to       DATE,         -- NULL = current owner
    deed_number    VARCHAR(50),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owners_parcel_id ON owners (parcel_id);
CREATE INDEX IF NOT EXISTS idx_owners_valid_to  ON owners (valid_to);
-- Trigram for fuzzy owner name search
CREATE INDEX IF NOT EXISTS idx_owners_name_trgm ON owners USING GIN (owner_name gin_trgm_ops);

-- ─── TABLE: tax_records ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_records (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id      UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    financial_year VARCHAR(9) NOT NULL,  -- e.g. '2024-25'
    amount_due     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status         tax_status_enum NOT NULL DEFAULT 'Defaulter',
    payment_date   DATE,
    arrears        NUMERIC(12, 2) DEFAULT 0,
    penalty        NUMERIC(12, 2) DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_parcel_id ON tax_records (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tax_fy ON tax_records (financial_year);
CREATE INDEX IF NOT EXISTS idx_tax_status ON tax_records (status);

-- ─── TABLE: utility_connections ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utility_connections (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id          UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    utility_type       utility_type_enum NOT NULL,
    connection_status  utility_status_enum NOT NULL DEFAULT 'Active',
    provider           VARCHAR(100),
    connection_id      VARCHAR(50) UNIQUE,
    avg_consumption    FLOAT,           -- kWh or KL
    consumption_unit   VARCHAR(10),     -- 'kWh' or 'KL'
    meter_status       VARCHAR(20) DEFAULT 'Working',  -- Working / Faulty / Missing
    recent_bill_amount NUMERIC(10, 2),
    last_reading_date  DATE,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utility_parcel_id ON utility_connections (parcel_id);

-- ─── TABLE: infrastructure_records ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infrastructure_records (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id              UUID UNIQUE NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    sewage_connected       BOOLEAN DEFAULT FALSE,
    nearest_manhole_id     VARCHAR(30),
    building_plan_approved BOOLEAN DEFAULT FALSE,
    approved_floors        VARCHAR(20),  -- e.g. 'G+3'
    construction_year      INTEGER,
    active_violations      INTEGER DEFAULT 0,
    violations_detail      JSONB DEFAULT '[]',
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infra_parcel_id ON infrastructure_records (parcel_id);

-- ─── TABLE: conflict_alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conflict_alerts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id    UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    alert_type   VARCHAR(100) NOT NULL,
    severity     conflict_severity_enum NOT NULL DEFAULT 'Medium',
    description  TEXT NOT NULL,
    detected_at  TIMESTAMPTZ DEFAULT NOW(),
    resolved     BOOLEAN DEFAULT FALSE,
    resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conflicts_parcel_id  ON conflict_alerts (parcel_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved   ON conflict_alerts (resolved);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity   ON conflict_alerts (severity);

-- ─── VIEW: parcels_with_owner (used by pg_tileserv for MVT) ──────────────────
CREATE OR REPLACE VIEW parcels_tile_view AS
SELECT
    p.id,
    p.ulpin,
    p.plot_number,
    p.geometry,
    p.area_sqm,
    p.land_use::TEXT,
    p.ward_name,
    p.address,
    o.owner_name,
    CASE WHEN t.status = 'Defaulter' THEN TRUE ELSE FALSE END AS is_tax_defaulter,
    EXISTS (
        SELECT 1 FROM conflict_alerts ca
        WHERE ca.parcel_id = p.id AND ca.resolved = FALSE
    ) AS has_conflict
FROM parcels p
LEFT JOIN owners o ON o.parcel_id = p.id AND o.valid_to IS NULL
LEFT JOIN LATERAL (
    SELECT status FROM tax_records
    WHERE parcel_id = p.id
    ORDER BY financial_year DESC
    LIMIT 1
) t ON TRUE;

-- Grant read access to pg_tileserv
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bhoomi;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO bhoomi;
