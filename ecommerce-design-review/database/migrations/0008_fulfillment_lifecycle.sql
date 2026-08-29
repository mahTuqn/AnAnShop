BEGIN;

INSERT INTO roles(code,name,is_system) VALUES('CUSTOMER','Khách hàng',TRUE)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,is_system=TRUE;
INSERT INTO user_roles(user_id,role_id)
SELECT u.id,r.id FROM users u CROSS JOIN roles r
WHERE r.code='CUSTOMER' AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM user_roles ux JOIN roles rx ON rx.id=ux.role_id WHERE ux.user_id=u.id AND rx.code IN ('ADMIN','STAFF','CUSTOMER'))
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS order_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status order_status,
    to_status order_status NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(500),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_events_timeline
    ON order_status_events(order_id, occurred_at DESC);

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS return_request_id UUID REFERENCES return_requests(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_refunds_return_request ON refunds(return_request_id) WHERE return_request_id IS NOT NULL;

-- The current checkout model creates one fulfillment shipment per order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_order_single ON shipments(order_id);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel;
ALTER TABLE notifications ADD CONSTRAINT notifications_channel
    CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'WEB'));

CREATE OR REPLACE FUNCTION fulfill_inventory(
    p_variant_id UUID,
    p_quantity INTEGER,
    p_reference_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_item inventory_items%ROWTYPE;
BEGIN
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023'; END IF;
    SELECT * INTO v_item FROM inventory_items WHERE variant_id = p_variant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory not found for variant %', p_variant_id USING ERRCODE = 'P0002'; END IF;
    IF v_item.reserved < p_quantity OR v_item.on_hand < p_quantity THEN
        RAISE EXCEPTION 'inventory cannot be fulfilled for variant %', p_variant_id USING ERRCODE = 'P0001';
    END IF;
    UPDATE inventory_items
       SET on_hand = on_hand - p_quantity,
           reserved = reserved - p_quantity,
           updated_at = NOW()
     WHERE id = v_item.id;
    INSERT INTO inventory_movements(inventory_item_id,type,quantity,reference_type,reference_id,created_by,note)
    VALUES(v_item.id,'SALE',-p_quantity,'ORDER',p_reference_id,p_created_by,'Delivered to customer');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION return_inventory(
    p_variant_id UUID,
    p_quantity INTEGER,
    p_reference_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_item inventory_items%ROWTYPE;
BEGIN
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023'; END IF;
    SELECT * INTO v_item FROM inventory_items WHERE variant_id = p_variant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory not found for variant %', p_variant_id USING ERRCODE = 'P0002'; END IF;
    UPDATE inventory_items SET on_hand = on_hand + p_quantity, updated_at = NOW() WHERE id = v_item.id;
    INSERT INTO inventory_movements(inventory_item_id,type,quantity,reference_type,reference_id,created_by,note)
    VALUES(v_item.id,'RETURN',p_quantity,'RETURN_REQUEST',p_reference_id,p_created_by,'Returned item accepted into stock');
END;
$$ LANGUAGE plpgsql;

COMMIT;