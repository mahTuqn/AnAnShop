import { AppError, Result, err, ok } from "../shared";

export interface InventoryReservation { variantId: string; quantity: number }
export interface InventoryRepository {
  getAvailable(variantId: string): Promise<number>;
  reserve(lines: InventoryReservation[], referenceId: string): Promise<Result<void>>;
  commitSale(lines: InventoryReservation[], referenceId: string): Promise<Result<void>>;
  release(lines: InventoryReservation[], referenceId: string): Promise<Result<void>>;
}

export function ensureAvailable(available: number, requested: number, variantId: string): Result<void> {
  return available >= requested
    ? ok(undefined)
    : err(new AppError("OUT_OF_STOCK", "Sản phẩm không đủ tồn kho", 409, { variantId, available, requested }));
}

