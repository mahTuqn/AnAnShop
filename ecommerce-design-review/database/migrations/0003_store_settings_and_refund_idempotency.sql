BEGIN;

CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::JSONB,
    description VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_settings_public ON store_settings (key) WHERE is_public = TRUE;

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON store_settings;
CREATE TRIGGER trg_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_idempotency_key ON refunds (idempotency_key) WHERE idempotency_key IS NOT NULL;

COMMIT;

