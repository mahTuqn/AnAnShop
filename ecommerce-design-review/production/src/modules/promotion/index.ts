import { AppError, Clock, Result, Vnd, err, ok, systemClock, vnd } from "../shared";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
export type CouponScope = "ORDER" | "PRODUCT" | "CATEGORY";
export interface Coupon { id: string; code: string; type: DiscountType; scope?: CouponScope; value: number; minimumOrder: Vnd; maximumDiscount?: Vnd; usageLimit?: number; used: number; startsAt: Date; endsAt: Date; active: boolean }
export interface PromotionLine { productId: string; subtotal: Vnd }
export interface CouponRepository {
  findByCode(code: string): Promise<Coupon | null>;
  findEligibleProductIds?(couponId: string, scope: CouponScope, productIds: string[]): Promise<Set<string>>;
}
export interface Discount { couponId: string; code: string; amount: Vnd; freeShipping: boolean }

export class PromotionService {
  constructor(private readonly coupons: CouponRepository, private readonly clock: Clock = systemClock) {}
  async evaluate(code: string | undefined, subtotal: Vnd, lines: PromotionLine[] = []): Promise<Result<Discount | null>> {
    if (!code) return ok(null);
    const coupon = await this.coupons.findByCode(code.trim().toUpperCase());
    const now = this.clock.now();
    if (!coupon || !coupon.active || coupon.startsAt > now || coupon.endsAt <= now) return err(new AppError("INVALID_COUPON", "Mã ưu đãi không hợp lệ hoặc đã hết hạn", 422));
    if (coupon.usageLimit !== undefined && coupon.used >= coupon.usageLimit) return err(new AppError("INVALID_COUPON", "Mã ưu đãi đã hết lượt sử dụng", 422));
    if (subtotal < coupon.minimumOrder) return err(new AppError("INVALID_COUPON", "Đơn hàng chưa đạt giá trị tối thiểu", 422, { minimumOrder: coupon.minimumOrder }));
    const scope = coupon.scope ?? "ORDER";
    let eligibleSubtotal: number = subtotal;
    if (scope !== "ORDER") {
      if (!lines.length || !this.coupons.findEligibleProductIds) return err(new AppError("INVALID_COUPON", "Không thể xác minh phạm vi mã ưu đãi", 422));
      const eligibleIds = await this.coupons.findEligibleProductIds(coupon.id, scope, [...new Set(lines.map((line) => line.productId))]);
      eligibleSubtotal = lines.filter((line) => eligibleIds.has(line.productId)).reduce((sum, line) => sum + line.subtotal, 0);
      if (eligibleSubtotal <= 0) return err(new AppError("INVALID_COUPON", "Giỏ hàng không có sản phẩm thuộc phạm vi mã ưu đãi", 422));
    }
    let amount = 0;
    if (coupon.type === "PERCENTAGE") amount = Math.floor((eligibleSubtotal * coupon.value) / 100);
    if (coupon.type === "FIXED_AMOUNT") amount = coupon.value;
    amount = Math.min(eligibleSubtotal, coupon.maximumDiscount === undefined ? amount : Math.min(amount, coupon.maximumDiscount));
    return ok({ couponId: coupon.id, code: coupon.code, amount: vnd(amount), freeShipping: coupon.type === "FREE_SHIPPING" });
  }
}