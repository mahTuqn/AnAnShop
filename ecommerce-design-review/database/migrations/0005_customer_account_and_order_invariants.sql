BEGIN;

-- A customer may not open two simultaneous return workflows for one order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_active_order
ON return_requests (order_id)
WHERE status IN ('REQUESTED', 'APPROVED', 'RECEIVED');

-- Speeds token cleanup and one-time token consumption checks.
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active_expiry
ON auth_tokens (type, expires_at)
WHERE consumed_at IS NULL;

COMMIT;
