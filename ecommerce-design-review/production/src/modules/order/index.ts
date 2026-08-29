import type { Vnd } from "../shared";

export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED";
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";
export interface ShippingAddress { fullName: string; phone: string; email?: string; province: string; district: string; ward: string; line1: string }
export interface OrderLine { variantId: string; productId: string; productName: string; variantName: string; sku: string; imageUrl?: string; quantity: number; unitPrice: Vnd; discountAmount: Vnd; lineTotal: Vnd }
export interface Order { id: string; code: string; ownerKey: string; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: "COD" | "MOMO" | "VNPAY" | "CARD"; currency: "VND"; subtotal: Vnd; shippingFee: Vnd; discountTotal: Vnd; grandTotal: Vnd; couponCode?: string; customerNote?: string; shippingMethod?: "STANDARD"; idempotencyKey: string; address: ShippingAddress; items: OrderLine[]; placedAt: Date }
export interface OrderRepository {
  findByIdempotencyKey(key: string, ownerKey: string): Promise<Order | null>;
  findById(id: string): Promise<Order | null>;
  listByOwner(ownerKey: string): Promise<Order[]>;
}

