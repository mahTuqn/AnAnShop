import fs from "node:fs";

const file = "database/schema.sql";
let source = fs.readFileSync(file, "utf8");
const exact = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  source = source.replace(before, after);
};

exact(
  "    provider_refund_id VARCHAR(150),\n    status payment_status NOT NULL DEFAULT 'PENDING',",
  "    provider_refund_id VARCHAR(150),\n    idempotency_key VARCHAR(100),\n    status payment_status NOT NULL DEFAULT 'PENDING',",
  "refund idempotency column",
);
exact(
  "    CONSTRAINT refunds_amount_positive CHECK (amount > 0)\n);\n\n-- Fulfillment and returns",
  "    CONSTRAINT refunds_amount_positive CHECK (amount > 0)\n);\nCREATE UNIQUE INDEX uq_refunds_idempotency_key ON refunds (idempotency_key) WHERE idempotency_key IS NOT NULL;\n\n-- Fulfillment and returns",
  "refund idempotency index",
);

const settings = `CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::JSONB,
    description VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_store_settings_public ON store_settings (key) WHERE is_public = TRUE;

`;
exact("CREATE TABLE audit_logs (", settings + "CREATE TABLE audit_logs (", "store settings table");
exact(
  "CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();",
  "CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();\nCREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();",
  "store settings timestamp trigger",
);

fs.writeFileSync(file, source, "utf8");
console.log("Canonical schema synchronized with migration 0003.");
