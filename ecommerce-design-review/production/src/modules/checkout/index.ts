import { AppError, Clock, Result, Vnd, addMoney, err, multiplyMoney, ok, positiveInt, subtractMoney, systemClock, uuid, vnd } from "../shared";
import type { CartRepository } from "../cart";
import type { CatalogRepository } from "../catalog";
import type { Discount, PromotionService } from "../promotion";
import type { Order, OrderRepository, ShippingAddress } from "../order";
import type { PaymentGateway, PaymentSession } from "../payment";

export interface CheckoutInput { ownerKey: string; idempotencyKey: string; paymentMethod: Order["paymentMethod"]; couponCode?: string; customerNote?: string; shippingMethod?: "STANDARD"; shippingAddress: ShippingAddress; itemIds?: string[]; directItems?: { variantId: string; quantity: number }[] }
export interface CheckoutOutput { order: Order; payment: PaymentSession; replayed: boolean }
export interface CheckoutTransaction {
  /** Adapter PostgreSQL MUST lock inventory rows (SELECT FOR UPDATE), re-read price/coupon,
   * create snapshots, reserve stock, redeem coupon and convert cart in one transaction. */
  execute(order: Order): Promise<Result<Order>>;
}

export class CheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogRepository,
    private readonly orders: OrderRepository,
    private readonly promotions: PromotionService,
    private readonly transaction: CheckoutTransaction,
    private readonly payments: PaymentGateway,
    private readonly clock: Clock = systemClock,
  ) {}

  async checkout(input: CheckoutInput): Promise<Result<CheckoutOutput>> {
    if (input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 100) return err(new AppError("VALIDATION_ERROR", "Idempotency-Key không hợp lệ", 400));
    const replay = await this.orders.findByIdempotencyKey(input.idempotencyKey, input.ownerKey);
    if (replay) {
      const payment = await this.payments.createSession(replay);
      return payment.ok ? ok({ order: replay, payment: payment.value, replayed: true }) : payment;
    }

    const lines: Order["items"] = [];
    
    if (input.directItems && input.directItems.length > 0) {
      for (const item of input.directItems) {
        const found = await this.catalog.findVariant(item.variantId);
        if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", `Sản phẩm không còn bán`, 409));
        positiveInt(item.quantity, "quantity");
        lines.push({ variantId: found.variant.id, productId: found.product.id, productName: found.product.name, variantName: found.variant.name, sku: found.variant.sku, imageUrl: found.product.imageUrl, quantity: item.quantity, unitPrice: found.variant.price, discountAmount: vnd(0), lineTotal: multiplyMoney(found.variant.price, item.quantity) });
      }
    } else {
      const cart = await this.carts.findActive(input.ownerKey);
      if (!cart || cart.items.length === 0) return err(new AppError("VALIDATION_ERROR", "Giỏ hàng đang trống", 422));
      const itemsToProcess = input.itemIds?.length ? cart.items.filter(i => input.itemIds!.includes(i.id)) : cart.items;
      if (itemsToProcess.length === 0) return err(new AppError("VALIDATION_ERROR", "Không có sản phẩm nào được chọn để thanh toán", 422));

      for (const item of itemsToProcess) {
        const found = await this.catalog.findVariant(item.variantId);
        if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", `SKU ${item.sku} không còn bán`, 409));
        positiveInt(item.quantity, "quantity");
        lines.push({ variantId: found.variant.id, productId: found.product.id, productName: found.product.name, variantName: found.variant.name, sku: found.variant.sku, imageUrl: found.product.imageUrl, quantity: item.quantity, unitPrice: found.variant.price, discountAmount: vnd(0), lineTotal: multiplyMoney(found.variant.price, item.quantity) });
      }
    }
    const subtotal = addMoney(...lines.map((line) => line.lineTotal));
    const discountResult = await this.promotions.evaluate(input.couponCode, subtotal, lines.map((line) => ({ productId: line.productId, subtotal: line.lineTotal })));
    if (!discountResult.ok) return discountResult;
    const shippingFee = shippingFor(subtotal, discountResult.value);
    const discountTotal = discountResult.value?.amount ?? vnd(0);
    const grandTotal = subtractMoney(addMoney(subtotal, shippingFee), discountTotal);
    const order: Order = { id: uuid("ord"), code: createOrderCode(this.clock.now()), ownerKey: input.ownerKey, status: "PENDING", paymentStatus: "PENDING", paymentMethod: input.paymentMethod, currency: "VND", subtotal, shippingFee, discountTotal, grandTotal, couponCode: discountResult.value?.code, customerNote: input.customerNote, shippingMethod: input.shippingMethod ?? "STANDARD", idempotencyKey: input.idempotencyKey, address: input.shippingAddress, items: lines, placedAt: this.clock.now() };
    const persisted = await this.transaction.execute(order);
    if (!persisted.ok) return persisted;
    // External side effects happen only after DB commit.
    const payment = await this.payments.createSession(persisted.value);
    if (!payment.ok) return payment;
    return ok({ order: persisted.value, payment: payment.value, replayed: false });
  }
}

export const FREE_SHIPPING_THRESHOLD = 699_000;
export const STANDARD_SHIPPING_FEE = 30_000;
export const shippingFor = (subtotal: Vnd, discount: Discount | null): Vnd => discount?.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD ? vnd(0) : vnd(STANDARD_SHIPPING_FEE);
const createOrderCode = (date: Date): string => `AN${date.toISOString().slice(2, 10).replaceAll("-", "")}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")}`;

