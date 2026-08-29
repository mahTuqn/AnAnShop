import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthSession, PasswordHasher, PublicUser, SessionIssuer, User, UserRepository } from "@/modules/auth";
import { AuthService } from "@/modules/auth";
import type { Cart, CartRepository } from "@/modules/cart";
import { CartService } from "@/modules/cart";
import type { CatalogRepository, ProductPage, ProductQuery, ProductSummary } from "@/modules/catalog";
import { CatalogService } from "@/modules/catalog";
import type { CheckoutTransaction } from "@/modules/checkout";
import { CheckoutService } from "@/modules/checkout";
import type { Coupon, CouponRepository } from "@/modules/promotion";
import { PromotionService } from "@/modules/promotion";
import type { Order, OrderRepository } from "@/modules/order";
import { CodPaymentGateway } from "@/modules/payment";
import { AppError, Result, err, ok, vnd } from "@/modules/shared";

const pbkdf2 = promisify(pbkdf2Callback);

class Pbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const digest = await pbkdf2(password, salt, 210_000, 32, "sha256");
    return `pbkdf2-sha256$210000$${salt.toString("base64url")}$${digest.toString("base64url")}`;
  }
  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm, roundsText, saltText, expectedText] = encoded.split("$");
    if (algorithm !== "pbkdf2-sha256" || !roundsText || !saltText || !expectedText) return false;
    const rounds = Number(roundsText);
    if (!Number.isSafeInteger(rounds) || rounds < 100_000 || rounds > 1_000_000) return false;
    const expected = Buffer.from(expectedText, "base64url");
    const actual = await pbkdf2(password, Buffer.from(saltText, "base64url"), rounds, expected.length, "sha256");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

class MemoryStore implements UserRepository, SessionIssuer, CartRepository, CatalogRepository, CouponRepository, OrderRepository, CheckoutTransaction {
  readonly users = new Map<string, User>();
  readonly sessions = new Map<string, AuthSession>();
  readonly carts = new Map<string, Cart>();
  readonly orders = new Map<string, Order>();
  readonly coupons = new Map<string, Coupon>();
  readonly products: ProductSummary[] = demoProducts();
  private queue: Promise<void> = Promise.resolve();

  async findByEmail(value: string): Promise<User | null> { return [...this.users.values()].find((user) => user.email === value) ?? null; }
  async create(user: User): Promise<void> { this.users.set(user.id, structuredClone(user)); }
  async issue(user: PublicUser): Promise<AuthSession> {
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
    const session = { token, user, expiresAt: new Date(Date.now() + 7 * 86_400_000) };
    this.sessions.set(token, session);
    return session;
  }
  resolveSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= new Date()) { this.sessions.delete(token); return null; }
    return session;
  }

  async findActive(ownerKey: string): Promise<Cart | null> { const cart = this.carts.get(ownerKey); return cart ? structuredClone(cart) : null; }
  async save(cart: Cart): Promise<void> { this.carts.set(cart.ownerKey, structuredClone(cart)); }

  async list(query: ProductQuery): Promise<ProductPage> {
    const needle = query.search?.trim().toLocaleLowerCase("vi");
    const filtered = this.products.filter((product) => (!needle || product.name.toLocaleLowerCase("vi").includes(needle)) && (!query.category || product.categorySlug === query.category) && (query.featured === undefined || product.featured === query.featured));
    const start = (query.page - 1) * query.pageSize;
    return { items: structuredClone(filtered.slice(start, start + query.pageSize)), page: query.page, pageSize: query.pageSize, total: filtered.length };
  }
  async findBySlug(slug: string): Promise<ProductSummary | null> { return structuredClone(this.products.find((product) => product.slug === slug) ?? null); }
  async findVariant(id: string): Promise<{ product: ProductSummary; variant: ProductSummary["variants"][number] } | null> {
    for (const product of this.products) { const variant = product.variants.find((item) => item.id === id); if (variant) return { product: structuredClone(product), variant: structuredClone(variant) }; }
    return null;
  }
  async findByCode(code: string): Promise<Coupon | null> { const coupon = this.coupons.get(code); return coupon ? structuredClone(coupon) : null; }
  async findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null> { return structuredClone([...this.orders.values()].find((order) => order.idempotencyKey === key && order.ownerKey === ownerKey) ?? null); }
  async findById(id: string): Promise<Order | null> { return structuredClone(this.orders.get(id) ?? null); }
  async listByOwner(ownerKey: string): Promise<Order[]> { return structuredClone([...this.orders.values()].filter((order) => order.ownerKey === ownerKey).sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())); }

  async execute(candidate: Order): Promise<Result<Order>> {
    return this.serial(async () => {
      const existing = [...this.orders.values()].find((order) => order.idempotencyKey === candidate.idempotencyKey && order.ownerKey === candidate.ownerKey);
      if (existing) return ok(structuredClone(existing));
      for (const line of candidate.items) {
        const found = await this.findVariant(line.variantId);
        if (!found || found.variant.available < line.quantity) return err(new AppError("OUT_OF_STOCK", `SKU ${line.sku} không đủ tồn kho`, 409));
      }
      for (const line of candidate.items) {
        const variant = this.products.flatMap((product) => product.variants).find((item) => item.id === line.variantId)!;
        variant.available -= line.quantity; // demo adapter models reservation as unavailable stock
      }
      this.orders.set(candidate.id, structuredClone(candidate));
      this.carts.delete(candidate.ownerKey);
      if (candidate.couponCode) { const coupon = this.coupons.get(candidate.couponCode); if (coupon) coupon.used += 1; }
      return ok(structuredClone(candidate));
    });
  }

  private async serial<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }
}

function demoProducts(): ProductSummary[] {
  return [
    { id: "50000000-0000-0000-0000-000000000001", slug: "dam-bau-linen-an-nhien", name: "Đầm bầu linen An Nhiên", categorySlug: "do-bau", imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80", featured: true, variants: [
      { id: "52000000-0000-0000-0000-000000000001", sku: "AN-NHIEN-M", name: "M", price: vnd(689_000), compareAtPrice: vnd(759_000), available: 24, active: true },
      { id: "52000000-0000-0000-0000-000000000002", sku: "AN-NHIEN-L", name: "L", price: vnd(689_000), compareAtPrice: vnd(759_000), available: 18, active: true },
    ] },
    { id: "50000000-0000-0000-0000-000000000002", slug: "bo-body-so-sinh-may-nho", name: "Bộ body sơ sinh Mây Nhỏ", categorySlug: "do-so-sinh", imageUrl: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80", featured: true, variants: [
      { id: "52000000-0000-0000-0000-000000000003", sku: "MAY-NHO-0-3M", name: "0–3M", price: vnd(289_000), available: 36, active: true },
      { id: "52000000-0000-0000-0000-000000000004", sku: "MAY-NHO-3-6M", name: "3–6M", price: vnd(289_000), available: 28, active: true },
    ] },
    { id: "50000000-0000-0000-0000-000000000003", slug: "ao-cho-bu-modal-diu-em", name: "Áo cho bú Modal Dịu Êm", categorySlug: "sau-sinh", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80", featured: false, variants: [
      { id: "52000000-0000-0000-0000-000000000005", sku: "DIU-EM-M", name: "M", price: vnd(429_000), compareAtPrice: vnd(479_000), available: 16, active: true },
    ] },
  ];
}

const store = new MemoryStore();
store.coupons.set("ANAN10", { id: "coupon_anan10", code: "ANAN10", type: "PERCENTAGE", value: 10, minimumOrder: vnd(500_000), maximumDiscount: vnd(100_000), usageLimit: 1000, used: 0, startsAt: new Date("2025-01-01"), endsAt: new Date("2030-01-01"), active: true });
const promotions = new PromotionService(store);

export const runtime = {
  store,
  auth: new AuthService(store, new Pbkdf2PasswordHasher(), store, undefined, { requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true" }),
  catalog: new CatalogService(store),
  cart: new CartService(store, store),
  checkout: new CheckoutService(store, store, store, promotions, store, new CodPaymentGateway()),
  promotions,
};

