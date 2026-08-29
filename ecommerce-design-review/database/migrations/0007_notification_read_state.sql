BEGIN;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id,created_at DESC) WHERE read_at IS NULL;
COMMIT;
