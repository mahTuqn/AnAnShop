-- Raw PostgreSQL invariants intentionally kept outside Prisma:
-- row locking, movement journal, partial indexes, CHECK constraints and triggers.
BEGIN;

CREATE OR REPLACE FUNCTION reserve_inventory(
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
    IF v_item.on_hand - v_item.reserved < p_quantity THEN RAISE EXCEPTION 'insufficient inventory for variant %', p_variant_id USING ERRCODE = 'P0001'; END IF;
    UPDATE inventory_items SET reserved = reserved + p_quantity, updated_at = NOW() WHERE id = v_item.id;
    INSERT INTO inventory_movements (inventory_item_id, type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.id, 'RESERVE', p_quantity, 'ORDER', p_reference_id, p_created_by);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_inventory(
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
    IF v_item.reserved < p_quantity THEN RAISE EXCEPTION 'release exceeds reservation for variant %', p_variant_id USING ERRCODE = 'P0001'; END IF;
    UPDATE inventory_items SET reserved = reserved - p_quantity, updated_at = NOW() WHERE id = v_item.id;
    INSERT INTO inventory_movements (inventory_item_id, type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.id, 'RELEASE', -p_quantity, 'ORDER', p_reference_id, p_created_by);
END;
$$ LANGUAGE plpgsql;

COMMIT;

