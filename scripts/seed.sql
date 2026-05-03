-- ============================================================================
-- Chemical Compounds Manager — Schema and seed
-- Run this once in the Supabase SQL editor before importing your CSV.
-- ============================================================================

-- Atomic constants ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS atomic_constants (
  id      SERIAL PRIMARY KEY,
  symbol  VARCHAR(5) NOT NULL UNIQUE,
  value   NUMERIC(10, 4) NOT NULL
);

INSERT INTO atomic_constants (symbol, value) VALUES
  ('C', 12.0107),
  ('H',  1.00794),
  ('O', 15.9994),
  ('N', 14.0067),
  ('S', 32.065)
ON CONFLICT (symbol) DO UPDATE SET value = EXCLUDED.value;

-- Compounds -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compounds (
  id          SERIAL PRIMARY KEY,
  compound    TEXT NOT NULL,
  rir         INTEGER NOT NULL,
  cf          TEXT NOT NULL,
  c_count     INTEGER NOT NULL,
  h_count     INTEGER NOT NULL,
  o_count     INTEGER NOT NULL DEFAULT 0,
  mm_da       NUMERIC(10, 4) NOT NULL,
  type        VARCHAR(5) GENERATED ALWAYS AS (
    CASE
      WHEN c_count = 10 AND o_count = 0 THEN 'MH'
      WHEN c_count = 10 AND o_count > 0 THEN 'OM'
      WHEN c_count = 15 AND o_count = 0 THEN 'SH'
      WHEN c_count = 15 AND o_count > 0 THEN 'OS'
      WHEN c_count = 20 AND o_count = 0 THEN 'DH'
      WHEN c_count = 20 AND o_count > 0 THEN 'OD'
      ELSE 'OC'
    END
  ) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compounds_compound_idx ON compounds (compound);
CREATE INDEX IF NOT EXISTS compounds_rir_idx ON compounds (rir);

-- Generated tables (saved table history) ------------------------------------
CREATE TABLE IF NOT EXISTS generated_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  rows        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_tables_updated_idx
  ON generated_tables (updated_at DESC);

-- Auto-update updated_at on row UPDATE
CREATE OR REPLACE FUNCTION set_generated_tables_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generated_tables_set_updated_at ON generated_tables;
CREATE TRIGGER generated_tables_set_updated_at
  BEFORE UPDATE ON generated_tables
  FOR EACH ROW
  EXECUTE FUNCTION set_generated_tables_updated_at();

-- Row Level Security --------------------------------------------------------
ALTER TABLE atomic_constants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE compounds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tables  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read constants" ON atomic_constants;
CREATE POLICY "authenticated read constants" ON atomic_constants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated all compounds" ON compounds;
CREATE POLICY "authenticated all compounds" ON compounds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated all generated_tables" ON generated_tables;
CREATE POLICY "authenticated all generated_tables" ON generated_tables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Sample insert pattern (your CSV import follows the same shape):
--   INSERT INTO compounds (compound, rir, cf, c_count, h_count, o_count, mm_da)
--   VALUES ('Ethyl ether', 529, 'C4H10O', 4, 10, 1, 74.07);
-- The `type` column is generated automatically — never pass it on insert.
-- Note: c_count/h_count/o_count are stored, but parseCF() also extracts N and S
-- which are used by calculateMM() at compute time only.
-- ============================================================================
