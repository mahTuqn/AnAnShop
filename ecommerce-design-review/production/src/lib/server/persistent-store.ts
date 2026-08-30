import { createHash } from "node:crypto";
import type { AuthSession, PublicUser, SessionIssuer, User, UserRepository } from "@/modules/auth";
import type { Cart, CartRepository } from "@/modules/cart";
import type { CatalogRepository, ProductPage, ProductQuery, ProductSummary, ProductVariant } from "@/modules/catalog";
import type { CheckoutTransaction } from "@/modules/checkout";
import type { Order, OrderRepository } from "@/modules/order";
import type { Coupon, CouponRepository } from "@/modules/promotion";
import { AppError, Result, err, ok, vnd } from "@/modules/shared";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";
import { orderLookupWhere } from "./order-lookup";

type Db = PrismaClient;

export class PersistentStore implements UserRepository, SessionIssuer, CartRepository, CatalogRepository, CouponRepository, OrderRepository, CheckoutTransaction {
  constructor(private readonly db: Db = getPrisma()) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, deletedAt: null } });
    return record ? { id: record.id, email: record.email!, fullName: record.fullName, passwordHash: record.passwordHash, status: record.status, createdAt: record.createdAt } : null;
  }
  async create(user: User): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.user.create({ data: { id: user.id, email: user.email, fullName: user.fullName, passwordHash: user.passwordHash, status: user.status } });
      await tx.$executeRawUnsafe(`INSERT INTO user_roles(user_id,role_id)
        SELECT $1::uuid,id FROM roles WHERE code='CUSTOMER' ON CONFLICT DO NOTHING`, user.id);
    });
  }
  async issue(user: PublicUser): Promise<AuthSession> {
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    await this.db.$executeRawUnsafe(
      `INSERT INTO auth_tokens(user_id,type,token_hash,expires_at) VALUES ($1::uuid,'REFRESH_TOKEN',$2,$3)`,
      user.id, hashToken(token), expiresAt,
    );
    return { token, user, expiresAt };
  }
  async resolveSession(token: string): Promise<AuthSession | null> {
    const rows = await this.db.$queryRawUnsafe<Array<{ id: string; email: string; full_name: string; status: User['status']; expires_at: Date }>>(
      `SELECT u.id, u.email, u.full_name, u.status, t.expires_at
         FROM auth_tokens t JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1 AND t.type = 'REFRESH_TOKEN' AND t.consumed_at IS NULL
          AND t.expires_at > NOW() AND u.deleted_at IS NULL LIMIT 1`,
      hashToken(token),
    );
    const row = rows[0];
    return row ? { token, user: { id: row.id, email: row.email, fullName: row.full_name, status: row.status }, expiresAt: row.expires_at } : null;
  }

  async list(query: ProductQuery): Promise<ProductPage> {
    const where = { status: "ACTIVE" as const, deletedAt: null, ...(query.category ? { category: { slug: query.category } } : {}), ...(query.featured === undefined ? {} : { featured: query.featured }), ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const records = await this.db.product.findMany({ where, include: productInclude, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize });
    const total = await this.db.product.count({ where });
    return { items: records.map(mapProduct), page: query.page, pageSize: query.pageSize, total };
  }
  async findBySlug(slug: string): Promise<ProductSummary | null> {
    const record = await this.db.product.findFirst({ where: { slug, status: "ACTIVE", deletedAt: null }, include: productInclude });
    return record ? mapProduct(record) : null;
  }
  async findVariant(id: string): Promise<{ product: ProductSummary; variant: ProductVariant } | null> {
    const record = await this.db.productVariant.findFirst({ where: { id, active: true, product: { status: "ACTIVE", deletedAt: null } }, include: { inventory: true, product: { include: productInclude } } });
    if (!record) return null;
    return { product: mapProduct(record.product), variant: mapVariant(record) };
  }

  async findActive(ownerKey: string): Promise<Cart | null> {
    const owner = parseOwner(ownerKey);
    const record = await this.db.cart.findFirst({ where: { status: "ACTIVE", ...(owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }) }, include: { items: { include: { variant: { include: { inventory: true, product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } } } } } });
    if (!record) return null;
    const items = record.items.map((item) => ({ id: item.id, variantId: item.variantId, product: { id: item.variant.product.id, slug: item.variant.product.slug, name: item.variant.product.name, imageUrl: item.variant.product.images[0]?.url }, variantName: variantDisplayName(item.variant.sku), sku: item.variant.sku, quantity: item.quantity, unitPrice: money(item.unitPrice), lineTotal: vnd(money(item.unitPrice) * item.quantity) }));
    return { id: record.id, ownerKey, currency: "VND", items, subtotal: vnd(items.reduce((sum, item) => sum + item.lineTotal, 0)), updatedAt: record.updatedAt };
  }
  async save(cart: Cart): Promise<void> {
    const owner = parseOwner(cart.ownerKey);
    await this.db.$transaction(async (tx) => {
      const current = await tx.cart.findFirst({ where: { status: "ACTIVE", ...(owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }) } });
      const saved = current
        ? await tx.cart.update({ where: { id: current.id }, data: { updatedAt: new Date() } })
        : await tx.cart.create({ data: { id: cart.id, userId: owner.userId, sessionId: owner.sessionId, status: "ACTIVE", currency: "VND" } });
      await tx.cartItem.deleteMany({ where: { cartId: saved.id } });
      if (cart.items.length) await tx.cartItem.createMany({ data: cart.items.map((item) => ({ id: item.id, cartId: saved.id, variantId: item.variantId, quantity: item.quantity, unitPrice: item.unitPrice })) });
    });
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const record = await this.db.coupon.findFirst({ where: { code: { equals: code, mode: "insensitive" } } });
    if (!record) return null;
    const [{ count }] = await this.db.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM coupon_redemptions WHERE coupon_id = $1::uuid", record.id);
    return { id: record.id, code: record.code, type: record.type, scope: record.scope, value: Number(record.value), minimumOrder: money(record.minimumOrder), maximumDiscount: record.maximumDiscount ? money(record.maximumDiscount) : undefined, usageLimit: record.usageLimit ?? undefined, used: Number(count), startsAt: record.startsAt, endsAt: record.endsAt, active: record.active };
  }

  async findEligibleProductIds(couponId: string, scope: "ORDER" | "PRODUCT" | "CATEGORY", productIds: string[]): Promise<Set<string>> {
    if (scope === "ORDER") return new Set(productIds);
    const rows = scope === "PRODUCT"
      ? await this.db.$queryRawUnsafe<Array<{ product_id: string }>>("SELECT product_id FROM coupon_products WHERE coupon_id=$1::uuid AND product_id=ANY($2::uuid[])", couponId, productIds)
      : await this.db.$queryRawUnsafe<Array<{ product_id: string }>>(`SELECT p.id AS product_id FROM products p JOIN coupon_categories cc ON cc.category_id=p.category_id
          WHERE cc.coupon_id=$1::uuid AND p.id=ANY($2::uuid[])`, couponId, productIds);
    return new Set(rows.map((row) => row.product_id));
  }
  async findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null> {
    const record = await this.db.order.findFirst({ where: { idempotencyKey: scopedIdempotencyKey(key, ownerKey) }, include: orderInclude });
    return record ? { ...mapOrder(record), idempotencyKey: key, ownerKey } : null;
  }
  async findById(idOrCode: string): Promise<Order | null> {
    const record = await this.db.order.findUnique({ where: orderLookupWhere(idOrCode), include: orderInclude });
    return record ? mapOrder(record) : null;
  }
  async listByOwner(ownerKey: string): Promise<Order[]> {
    const owner = parseOwner(ownerKey);
    if (!owner.userId) return []; // guest lookup requires a signed lookup token/phone flow
    const records = await this.db.order.findMany({ where: { userId: owner.userId }, include: orderInclude, orderBy: { placedAt: "desc" } });
    return records.map(mapOrder);
  }

  async execute(candidate: Order): Promise<Result<Order>> {
    try {
      const saved = await this.db.$transaction(async (tx) => {
        const storageKey = scopedIdempotencyKey(candidate.idempotencyKey, candidate.ownerKey);
        const replay = await tx.order.findFirst({ where: { idempotencyKey: storageKey }, include: orderInclude });
        if (replay) return { ...mapOrder(replay), idempotencyKey: candidate.idempotencyKey, ownerKey: candidate.ownerKey };
        const owner = parseOwner(candidate.ownerKey);
        let lockedSubtotal = 0;
        for (const line of candidate.items) {
          const variants = await tx.$queryRawUnsafe<Array<{ price: string; active: boolean; product_id: string; product_status: string; deleted_at: Date | null }>>(
            `SELECT v.price::text,v.active,v.product_id,p.status::text AS product_status,p.deleted_at
               FROM product_variants v JOIN products p ON p.id=v.product_id
              WHERE v.id=$1::uuid FOR SHARE OF v,p`, line.variantId,
          );
          const variant = variants[0];
          if (!variant || !variant.active || variant.product_status !== "ACTIVE" || variant.deleted_at || variant.product_id !== line.productId)
            throw new AppError("CONFLICT", `SKU ${line.sku} không còn được bán`, 409);
          const currentPrice = Number(variant.price);
          if (!Number.isSafeInteger(currentPrice) || currentPrice !== line.unitPrice)
            throw new AppError("CONFLICT", `Giá SKU ${line.sku} vừa thay đổi, vui lòng kiểm tra lại giỏ hàng`, 409);
          lockedSubtotal += currentPrice * line.quantity;
        }
        if (lockedSubtotal !== candidate.subtotal) throw new AppError("CONFLICT", "Tổng tiền sản phẩm không còn hợp lệ", 409);

        let lockedCouponId: string | undefined;
        let expectedDiscount = 0;
        let freeShipping = false;
        if (candidate.couponCode) {
          const coupons = await tx.$queryRawUnsafe<Array<{ id: string; scope: string; type: string; value: string; minimum_order: string; maximum_discount: string | null; usage_limit: number | null; usage_limit_per_user: number | null; starts_at: Date; ends_at: Date; active: boolean }>>(
            `SELECT id,scope::text,type::text,value::text,minimum_order::text,maximum_discount::text,usage_limit,usage_limit_per_user,starts_at,ends_at,active
               FROM coupons WHERE UPPER(code)=UPPER($1) FOR UPDATE`, candidate.couponCode,
          );
          const coupon = coupons[0];
          const now = new Date();
          if (!coupon || !coupon.active || coupon.starts_at > now || coupon.ends_at <= now || lockedSubtotal < Number(coupon.minimum_order))
            throw new AppError("INVALID_COUPON", "Mã ưu đãi không còn hợp lệ", 422);
          const [{ used }] = await tx.$queryRawUnsafe<Array<{ used: bigint }>>("SELECT COUNT(*)::bigint AS used FROM coupon_redemptions WHERE coupon_id=$1::uuid", coupon.id);
          if (coupon.usage_limit !== null && Number(used) >= coupon.usage_limit) throw new AppError("INVALID_COUPON", "Mã ưu đãi đã hết lượt sử dụng", 422);
          if (owner.userId && coupon.usage_limit_per_user !== null) {
            const [{ used_by_user }] = await tx.$queryRawUnsafe<Array<{ used_by_user: bigint }>>("SELECT COUNT(*)::bigint AS used_by_user FROM coupon_redemptions WHERE coupon_id=$1::uuid AND user_id=$2::uuid", coupon.id, owner.userId);
            if (Number(used_by_user) >= coupon.usage_limit_per_user) throw new AppError("INVALID_COUPON", "Bạn đã dùng hết lượt của mã ưu đãi", 422);
          }
          let eligibleProductIds = new Set(candidate.items.map((line) => line.productId));
          if (coupon.scope === "PRODUCT") {
            const rows = await tx.$queryRawUnsafe<Array<{ product_id: string }>>("SELECT product_id FROM coupon_products WHERE coupon_id=$1::uuid AND product_id=ANY($2::uuid[])", coupon.id, [...eligibleProductIds]);
            eligibleProductIds = new Set(rows.map((row) => row.product_id));
          } else if (coupon.scope === "CATEGORY") {
            const rows = await tx.$queryRawUnsafe<Array<{ product_id: string }>>(`SELECT p.id AS product_id FROM products p JOIN coupon_categories cc ON cc.category_id=p.category_id
              WHERE cc.coupon_id=$1::uuid AND p.id=ANY($2::uuid[])`, coupon.id, [...eligibleProductIds]);
            eligibleProductIds = new Set(rows.map((row) => row.product_id));
          }
          const eligibleSubtotal = candidate.items.filter((line) => eligibleProductIds.has(line.productId)).reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
          if (eligibleSubtotal <= 0) throw new AppError("INVALID_COUPON", "Giỏ hàng không có sản phẩm thuộc phạm vi mã ưu đãi", 422);
          freeShipping = coupon.type === "FREE_SHIPPING";
          if (coupon.type === "PERCENTAGE") expectedDiscount = Math.floor(eligibleSubtotal * Number(coupon.value) / 100);
          if (coupon.type === "FIXED_AMOUNT") expectedDiscount = Number(coupon.value);
          if (coupon.maximum_discount !== null) expectedDiscount = Math.min(expectedDiscount, Number(coupon.maximum_discount));
          expectedDiscount = Math.min(expectedDiscount, eligibleSubtotal);
          lockedCouponId = coupon.id;
        }
        const expectedShipping = freeShipping || lockedSubtotal >= 699_000 ? 0 : 30_000;
        if (candidate.discountTotal !== expectedDiscount || candidate.shippingFee !== expectedShipping || candidate.grandTotal !== lockedSubtotal + expectedShipping - expectedDiscount)
          throw new AppError("CONFLICT", "Tổng thanh toán vừa thay đổi, vui lòng kiểm tra lại đơn hàng", 409);

        await tx.order.create({ data: { id: candidate.id, code: candidate.code, userId: owner.userId, guestEmail: owner.userId ? undefined : candidate.address.email, guestPhone: owner.userId ? undefined : candidate.address.phone, status: candidate.status, paymentStatus: candidate.paymentStatus, currency: "VND", subtotal: candidate.subtotal, shippingFee: candidate.shippingFee, discountTotal: candidate.discountTotal, taxTotal: 0, grandTotal: candidate.grandTotal, customerNote: candidate.customerNote, idempotencyKey: storageKey, placedAt: candidate.placedAt, addresses: { create: { type: "SHIPPING", fullName: candidate.address.fullName, phone: candidate.address.phone, email: candidate.address.email, province: candidate.address.province, district: candidate.address.district, ward: candidate.address.ward, line1: candidate.address.line1 } }, items: { create: candidate.items.map((line) => ({ variantId: line.variantId, productId: line.productId, productName: line.productName, variantName: line.variantName, sku: line.sku, imageUrl: line.imageUrl, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, lineTotal: line.lineTotal })) } } });
        // Wait until DELIVERED status to decrement inventory according to user rules
        if (candidate.couponCode && lockedCouponId) {
          await tx.$executeRawUnsafe(
            "INSERT INTO coupon_redemptions (coupon_id, order_id, user_id) VALUES ($1::uuid, $2::uuid, $3::uuid)",
            lockedCouponId, candidate.id, owner.userId || null
          );
        }
        const activeCart = await tx.cart.findFirst({ where: { status: "ACTIVE", ...(owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }) }, select: { id: true } });
        if (activeCart) {
          await tx.cartItem.deleteMany({ where: { cartId: activeCart.id, variantId: { in: candidate.items.map((line) => line.variantId) } } });
          const remaining = await tx.cartItem.count({ where: { cartId: activeCart.id } });
          await tx.cart.update({ where: { id: activeCart.id }, data: { status: remaining === 0 ? "CONVERTED" : "ACTIVE", updatedAt: new Date() } });
        }
        await tx.payment.create({ data: { orderId: candidate.id, method: candidate.paymentMethod, status: "PENDING", amount: candidate.grandTotal, currency: "VND", idempotencyKey: `${candidate.id}:payment` } });
        
        // Temporarily bypass missing tables: order_status_events and notifications
        // await tx.$executeRawUnsafe("INSERT INTO order_status_events...");
        // if (owner.userId) await tx.$executeRawUnsafe("INSERT INTO notifications...");

        const created = await tx.order.findUniqueOrThrow({ where: { id: candidate.id }, include: orderInclude });
        return { ...mapOrder(created), idempotencyKey: candidate.idempotencyKey, ownerKey: candidate.ownerKey };
      }, { isolationLevel: "Serializable" });
      return ok(saved);
    } catch (error) {
      if (error instanceof AppError) return err(error);
      const message = error instanceof Error ? error.message : "Database transaction failed";
      if (/could not serialize|Unique constraint/i.test(message)) return err(new AppError("CONFLICT", "Dữ liệu đơn hàng vừa thay đổi, vui lòng thử lại", 409));
      return err(new AppError("INTERNAL_ERROR", "Lỗi DB: " + message, 500));
    }
  }
}

const productInclude = { category: true, images: { orderBy: { position: "asc" as const } }, variants: { where: { active: true }, include: { inventory: true } } } as const;
const orderInclude = { addresses: true, items: true, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } as const;
const money = (value: { toString(): string }): ReturnType<typeof vnd> => vnd(Number(value.toString()));
const variantDisplayName = (sku: string): string => {
  const monthRange = sku.match(/-(\d+)-(\d+M)$/i);
  if (monthRange) return `${monthRange[1]}–${monthRange[2]}`;
  return sku.split("-").at(-1) || sku;
};

const mapVariant = (record: { id: string; sku: string; price: { toString(): string }; compareAtPrice: { toString(): string } | null; active: boolean; inventory: { onHand: number; reserved: number } | null }): ProductVariant => ({ id: record.id, sku: record.sku, name: variantDisplayName(record.sku), price: money(record.price), compareAtPrice: record.compareAtPrice ? money(record.compareAtPrice) : undefined, available: Math.max(0, record.inventory?.onHand ?? 0), active: record.active });
const mapProduct = (record: any): ProductSummary => ({ id: record.id, slug: record.slug, name: record.name, categorySlug: record.category.slug, imageUrl: record.images[0]?.url, images: record.images.map((img: any) => img.url), featured: record.featured, variants: record.variants.map(mapVariant) });
const mapOrder = (record: any): Order => { const address = record.addresses.find((item: any) => item.type === "SHIPPING") ?? record.addresses[0]; return { id: record.id, code: record.code, ownerKey: record.userId ? `user:${record.userId}` : `guest-order:${record.id}`, status: record.status, paymentStatus: record.paymentStatus, paymentMethod: record.payments[0]?.method ?? "COD", currency: "VND", subtotal: money(record.subtotal), shippingFee: money(record.shippingFee), discountTotal: money(record.discountTotal), grandTotal: money(record.grandTotal), carrier: record.carrier ?? undefined, trackingCode: record.trackingCode ?? undefined, shippedAt: record.shippedAt ?? undefined, idempotencyKey: record.idempotencyKey ?? record.id, address: { fullName: address.fullName, phone: address.phone, email: address.email ?? undefined, province: address.province, district: address.district, ward: address.ward, line1: address.line1 }, items: record.items.map((line: any) => ({ variantId: line.variantId ?? "", productId: line.productId ?? "", productName: line.productName, variantName: line.variantName ?? line.sku, sku: line.sku, imageUrl: line.imageUrl ?? undefined, quantity: line.quantity, unitPrice: money(line.unitPrice), discountAmount: money(line.discountAmount), lineTotal: money(line.lineTotal) })), placedAt: record.placedAt }; };
const parseOwner = (ownerKey: string): { userId?: string; sessionId?: string } => ownerKey.startsWith("user:") ? { userId: ownerKey.slice(5) } : { sessionId: ownerKey.replace(/^guest:/, "") };


const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
const scopedIdempotencyKey = (key: string, ownerKey: string): string => createHash("sha256").update(ownerKey).update("\0").update(key).digest("hex");
