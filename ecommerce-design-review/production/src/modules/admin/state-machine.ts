import { AppError, Result, err, ok } from "../shared";
import type { OrderStatus } from "../order";

export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CLOSED";

const orderTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  // Picking/packing orders cannot be cancelled silently; use an exception/refund workflow.
  PROCESSING: ["SHIPPING"],
  SHIPPING: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: [],
};

const returnTransitions: Readonly<Record<ReturnStatus, readonly ReturnStatus[]>> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "CLOSED"],
  REJECTED: ["CLOSED"],
  RECEIVED: ["REFUNDED", "CLOSED"],
  REFUNDED: ["CLOSED"],
  CLOSED: [],
};

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean => orderTransitions[from].includes(to);
export const canTransitionReturn = (from: ReturnStatus, to: ReturnStatus): boolean => returnTransitions[from].includes(to);

export function assertOrderTransition(from: OrderStatus, to: string): Result<OrderStatus> {
  if (!Object.hasOwn(orderTransitions, to) || !canTransitionOrder(from, to as OrderStatus)) return err(new AppError("CONFLICT", `Không thể chuyển đơn hàng từ ${from} sang ${to}`, 409, { from, to }));
  return ok(to as OrderStatus);
}

export function assertReturnTransition(from: ReturnStatus, to: string): Result<ReturnStatus> {
  if (!Object.hasOwn(returnTransitions, to) || !canTransitionReturn(from, to as ReturnStatus)) return err(new AppError("CONFLICT", `Không thể chuyển đổi trả từ ${from} sang ${to}`, 409, { from, to }));
  return ok(to as ReturnStatus);
}

