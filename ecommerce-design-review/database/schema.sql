-- An An Shop - PostgreSQL schema
-- PostgreSQL 15+ recommended. All timestamps are stored in UTC.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED');
CREATE TYPE token_type AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'REFRESH_TOKEN');
CREATE TYPE product_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE cart_status AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');
CREATE TYPE payment_method AS ENUM ('COD', 'MOMO', 'VNPAY', 'CARD');
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE shipment_status AS ENUM ('PENDING', 'READY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
CREATE TYPE coupon_scope AS ENUM ('ORDER', 'PRODUCT', 'CATEGORY');
CREATE TYPE review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE inventory_movement_type AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'RESERVE', 'RELEASE');
CREATE TYPE return_status AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CLOSED');
CREATE TYPE content_type AS ENUM ('PAGE', 'ARTICLE', 'BANNER');
CREATE TYPE content_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Identity and authorization
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320),
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX uq_users_email_active ON users (LOWER(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_phone_active ON users (phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type token_type NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_tokens_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_auth_tokens_user_type ON auth_tokens (user_id, type, expires_at DESC);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province_code VARCHAR(20),
    province VARCHAR(100) NOT NULL,
    district_code VARCHAR(20),
    district VARCHAR(100) NOT NULL,
    ward_code VARCHAR(20),
    ward VARCHAR(100) NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses (user_id);
CREATE UNIQUE INDEX uq_addresses_default ON addresses (user_id) WHERE is_default = TRUE;

-- Catalog
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX idx_categories_parent_position ON categories (parent_id, position) WHERE active = TRUE;

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    short_description VARCHAR(500),
    description TEXT,
    material TEXT,
    care_instructions TEXT,
    seo_title VARCHAR(70),
    seo_description VARCHAR(170),
    status product_status NOT NULL DEFAULT 'DRAFT',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_category_status ON products (category_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_featured ON products (featured, published_at DESC) WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(short_description, '')));
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, position)
);

CREATE TABLE product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, name)
);

CREATE TABLE product_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value VARCHAR(80) NOT NULL,
    color_hex CHAR(7),
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (option_id, value),
    UNIQUE (id, option_id),
    CONSTRAINT option_color_hex CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(80) NOT NULL UNIQUE,
    barcode VARCHAR(80) UNIQUE,
    price NUMERIC(14,2) NOT NULL,
    compare_at_price NUMERIC(14,2),
    cost_price NUMERIC(14,2),
    weight_grams INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT variants_price_nonnegative CHECK (price >= 0),
    CONSTRAINT variants_compare_price CHECK (compare_at_price IS NULL OR compare_at_price >= price),
    CONSTRAINT variants_weight_positive CHECK (weight_grams IS NULL OR weight_grams > 0)
);

CREATE INDEX idx_variants_product_active ON product_variants (product_id, active);

CREATE TABLE variant_option_values (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL,
    PRIMARY KEY (variant_id, option_id),
    FOREIGN KEY (option_value_id, option_id) REFERENCES product_option_values(id, option_id) ON DELETE RESTRICT
);

CREATE TABLE facet_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE facet_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facet_id UUID NOT NULL REFERENCES facet_definitions(id) ON DELETE CASCADE,
    value VARCHAR(120) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (facet_id, value)
);

CREATE TABLE product_facet_values (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    facet_value_id UUID NOT NULL REFERENCES facet_values(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, facet_value_id)
);

CREATE INDEX idx_product_facets_value ON product_facet_values (facet_value_id, product_id);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    on_hand INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    low_stock_level INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_nonnegative CHECK (on_hand >= 0 AND reserved >= 0 AND low_stock_level >= 0),
    CONSTRAINT inventory_reserved_available CHECK (reserved <= on_hand)
);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    type inventory_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movement_nonzero CHECK (quantity <> 0)
);

CREATE INDEX idx_inventory_movements_item_date ON inventory_movements (inventory_item_id, created_at DESC);

-- Shopping carts
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(128),
    status cart_status NOT NULL DEFAULT 'ACTIVE',
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT carts_owner_required CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_active_cart_user ON carts (user_id) WHERE user_id IS NOT NULL AND status = 'ACTIVE';
CREATE UNIQUE INDEX uq_active_cart_session ON carts (session_id) WHERE session_id IS NOT NULL AND status = 'ACTIVE';
CREATE INDEX idx_carts_expiration ON carts (expires_at) WHERE status = 'ACTIVE';

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, variant_id),
    CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT cart_items_price_nonnegative CHECK (unit_price >= 0)
);

-- Promotions
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    type discount_type NOT NULL,
    scope coupon_scope NOT NULL DEFAULT 'ORDER',
    value NUMERIC(14,2) NOT NULL,
    minimum_order NUMERIC(14,2) NOT NULL DEFAULT 0,
    maximum_discount NUMERIC(14,2),
    usage_limit INTEGER,
    usage_limit_per_user INTEGER,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT coupons_value_positive CHECK (value > 0),
    CONSTRAINT coupons_percentage_limit CHECK (type <> 'PERCENTAGE' OR value <= 100),
    CONSTRAINT coupons_minimum_nonnegative CHECK (minimum_order >= 0),
    CONSTRAINT coupons_time_range CHECK (ends_at > starts_at),
    CONSTRAINT coupons_usage_positive CHECK (usage_limit IS NULL OR usage_limit > 0),
    CONSTRAINT coupons_user_usage_positive CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0)
);

CREATE UNIQUE INDEX uq_coupons_code ON coupons (UPPER(code));
CREATE INDEX idx_coupons_active_period ON coupons (active, starts_at, ends_at);

CREATE TABLE coupon_products (
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE coupon_categories (
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, category_id)
);

-- Orders use snapshots so historical data survives catalog and address changes.
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email VARCHAR(320),
    guest_phone VARCHAR(20),
    status order_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    subtotal NUMERIC(14,2) NOT NULL,
    shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(14,2) NOT NULL,
    customer_note TEXT,
    admin_note TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orders_customer_required CHECK (user_id IS NOT NULL OR guest_phone IS NOT NULL OR guest_email IS NOT NULL),
    CONSTRAINT orders_amounts_nonnegative CHECK (subtotal >= 0 AND shipping_fee >= 0 AND discount_total >= 0 AND tax_total >= 0 AND grand_total >= 0),
    CONSTRAINT orders_total_formula CHECK (grand_total = subtotal + shipping_fee + tax_total - discount_total)
);

CREATE INDEX idx_orders_user_date ON orders (user_id, placed_at DESC);
CREATE INDEX idx_orders_status_date ON orders (status, placed_at DESC);
CREATE INDEX idx_orders_payment_status ON orders (payment_status, placed_at DESC);
CREATE INDEX idx_orders_guest_phone ON orders (guest_phone, placed_at DESC) WHERE user_id IS NULL;

CREATE TABLE order_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'SHIPPING',
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(320),
    province_code VARCHAR(20),
    province VARCHAR(100) NOT NULL,
    district_code VARCHAR(20),
    district VARCHAR(100) NOT NULL,
    ward_code VARCHAR(20),
    ward VARCHAR(100) NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20),
    UNIQUE (order_id, type),
    CONSTRAINT order_address_type CHECK (type IN ('SHIPPING', 'BILLING'))
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    variant_name VARCHAR(200),
    sku VARCHAR(80) NOT NULL,
    image_url TEXT,
    attributes JSONB NOT NULL DEFAULT '{}'::JSONB,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL,
    CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT order_items_amounts_nonnegative CHECK (unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0),
    CONSTRAINT order_items_total_formula CHECK (line_total = unit_price * quantity - discount_amount)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id) WHERE product_id IS NOT NULL;

CREATE TABLE order_coupons (
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    PRIMARY KEY (order_id, code),
    CONSTRAINT order_coupon_discount_nonnegative CHECK (discount_amount >= 0)
);

CREATE TABLE coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (coupon_id, order_id)
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id, redeemed_at DESC);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions (user_id, coupon_id) WHERE user_id IS NOT NULL;

-- Payment event IDs and idempotency keys prevent duplicated webhook processing.
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50),
    provider_transaction_id VARCHAR(150),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX uq_payments_provider_transaction ON payments (provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX idx_payments_order ON payments (order_id, created_at DESC);
CREATE INDEX idx_payments_pending ON payments (status, created_at) WHERE status IN ('PENDING', 'AUTHORIZED');

CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    provider_event_id VARCHAR(180) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (payment_id, provider_event_id)
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL,
    reason TEXT,
    provider_refund_id VARCHAR(150),
    idempotency_key VARCHAR(100),
    status payment_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT refunds_amount_positive CHECK (amount > 0)
);
CREATE UNIQUE INDEX uq_refunds_idempotency_key ON refunds (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Fulfillment and returns
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    carrier VARCHAR(80) NOT NULL,
    service VARCHAR(80),
    tracking_code VARCHAR(120),
    status shipment_status NOT NULL DEFAULT 'PENDING',
    shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    estimated_delivery_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shipments_fee_nonnegative CHECK (shipping_fee >= 0)
);
CREATE UNIQUE INDEX uq_shipments_tracking ON shipments (carrier, tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX idx_shipments_order ON shipments (order_id);
CREATE INDEX idx_shipments_status ON shipments (status, updated_at DESC);

CREATE TABLE shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    provider_event_id VARCHAR(180),
    status shipment_status NOT NULL,
    location VARCHAR(255),
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_shipment_provider_event ON shipment_events (shipment_id, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX idx_shipment_events_timeline ON shipment_events (shipment_id, occurred_at DESC);

CREATE TABLE return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status return_status NOT NULL DEFAULT 'REQUESTED',
    reason VARCHAR(150) NOT NULL,
    customer_note TEXT,
    admin_note TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_returns_order ON return_requests (order_id);
CREATE INDEX idx_returns_status_date ON return_requests (status, requested_at DESC);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    condition VARCHAR(100),
    resolution VARCHAR(50),
    refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    UNIQUE (return_request_id, order_item_id),
    CONSTRAINT return_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT return_items_refund_nonnegative CHECK (refund_amount >= 0)
);

-- Customer engagement
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE wishlist_items (
    wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (wishlist_id, product_id)
);
CREATE INDEX idx_wishlist_items_product ON wishlist_items (product_id);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL,
    title VARCHAR(150),
    content TEXT,
    status review_status NOT NULL DEFAULT 'PENDING',
    verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (user_id, product_id, order_item_id)
);
CREATE INDEX idx_reviews_product_status ON reviews (product_id, status, created_at DESC);
CREATE INDEX idx_reviews_pending ON reviews (created_at) WHERE status = 'PENDING';

CREATE TABLE review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (review_id, position)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    template_code VARCHAR(100) NOT NULL,
    recipient VARCHAR(320) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_channel CHECK (channel IN ('EMAIL', 'SMS', 'PUSH'))
);
CREATE INDEX idx_notifications_pending ON notifications (status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- CMS
CREATE TABLE content_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type content_type NOT NULL,
    status content_status NOT NULL DEFAULT 'DRAFT',
    slug VARCHAR(220) NOT NULL UNIQUE,
    title VARCHAR(250) NOT NULL,
    excerpt TEXT,
    body JSONB NOT NULL DEFAULT '{}'::JSONB,
    featured_image_url TEXT,
    seo_title VARCHAR(70),
    seo_description VARCHAR(170),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_content_type_status ON content_entries (type, status, published_at DESC);
CREATE INDEX idx_content_body ON content_entries USING GIN (body);

CREATE TABLE store_settings (
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

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON return_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wishlists_updated_at BEFORE UPDATE ON wishlists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
