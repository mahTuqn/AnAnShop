import { AppError, Result, err, ok } from "../shared";
import type { Order } from "../order";

export interface PaymentSession { paymentId: string; status: "PENDING" | "PAID"; redirectUrl?: string }
export interface PaymentGateway { createSession(order: Order): Promise<Result<PaymentSession>>; verifyWebhook(rawBody: string, signature: string): Promise<Result<{ providerEventId: string; paymentId: string; paid: boolean }>> }

export class CodPaymentGateway implements PaymentGateway {
  async createSession(order: Order): Promise<Result<PaymentSession>> {
    if (order.paymentMethod !== "COD") return err(new AppError("PAYMENT_FAILED", "Cổng thanh toán chưa được cấu hình", 503));
    return ok({ paymentId: `pay_${order.id}`, status: "PENDING" });
  }
  async verifyWebhook(): Promise<Result<{ providerEventId: string; paymentId: string; paid: boolean }>> {
    return err(new AppError("VALIDATION_ERROR", "COD không hỗ trợ webhook", 400));
  }
}

