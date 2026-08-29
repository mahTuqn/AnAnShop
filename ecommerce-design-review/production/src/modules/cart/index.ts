import { AppError, Result, Vnd, addMoney, err, multiplyMoney, ok, positiveInt, uuid } from "../shared";
import type { CatalogRepository, ProductSummary } from "../catalog";

export interface CartItem { id: string; variantId: string; product: Pick<ProductSummary, "id" | "slug" | "name" | "imageUrl">; variantName: string; sku: string; quantity: number; unitPrice: Vnd; lineTotal: Vnd }
export interface Cart { id: string; ownerKey: string; currency: "VND"; items: CartItem[]; subtotal: Vnd; updatedAt: Date }
export interface CartRepository {
  findActive(ownerKey: string): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
}

export class CartService {
  constructor(private readonly carts: CartRepository, private readonly catalog: CatalogRepository) {}
  async get(ownerKey: string): Promise<Cart> { return (await this.carts.findActive(ownerKey)) ?? emptyCart(ownerKey); }
  async add(ownerKey: string, variantId: string, quantityInput: number): Promise<Result<Cart>> {
    const quantity = positiveInt(quantityInput, "quantity");
    const found = await this.catalog.findVariant(variantId);
    if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", "Biến thể không tồn tại", 404));
    const cart = await this.get(ownerKey);
    const current = cart.items.find((item) => item.variantId === variantId);
    const nextQuantity = (current?.quantity ?? 0) + quantity;
    // Inventory logic removed
    if (current) { current.quantity = nextQuantity; current.unitPrice = found.variant.price; current.lineTotal = multiplyMoney(found.variant.price, nextQuantity); }
    else cart.items.push({ id: uuid("ci"), variantId, product: found.product, variantName: found.variant.name, sku: found.variant.sku, quantity, unitPrice: found.variant.price, lineTotal: multiplyMoney(found.variant.price, quantity) });
    recalculate(cart);
    await this.carts.save(cart);
    return ok(cart);
  }

  async addMany(ownerKey: string, lines: ReadonlyArray<{ variantId: string; quantity: number }>): Promise<Result<Cart>> {
    if (lines.length === 0 || lines.length > 100) return err(new AppError("VALIDATION_ERROR", "Danh sách mua lại không hợp lệ", 400));
    const cart = await this.get(ownerKey);
    for (const line of lines) {
      const quantity = positiveInt(line.quantity, "quantity");
      const found = await this.catalog.findVariant(line.variantId);
      if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", "Biến thể không còn được bán", 404));
      const current = cart.items.find((item) => item.variantId === line.variantId);
      const nextQuantity = (current?.quantity ?? 0) + quantity;
      // Inventory logic removed
      if (current) { current.quantity = nextQuantity; current.unitPrice = found.variant.price; current.lineTotal = multiplyMoney(found.variant.price, nextQuantity); }
      else cart.items.push({ id: uuid("ci"), variantId: found.variant.id, product: found.product, variantName: found.variant.name, sku: found.variant.sku, quantity, unitPrice: found.variant.price, lineTotal: multiplyMoney(found.variant.price, quantity) });
    }
    recalculate(cart);
    await this.carts.save(cart);
    return ok(cart);
  }
  async setQuantity(ownerKey: string, itemId: string, quantityInput: number): Promise<Result<Cart>> {
    const quantity = positiveInt(quantityInput, "quantity");
    const cart = await this.get(ownerKey);
    const item = cart.items.find((candidate) => candidate.id === itemId);
    if (!item) return err(new AppError("NOT_FOUND", "Không tìm thấy sản phẩm trong giỏ hàng", 404));
    const found = await this.catalog.findVariant(item.variantId);
    if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", "Biến thể không còn được bán", 404));
    // Inventory logic removed
    item.quantity = quantity;
    item.unitPrice = found.variant.price;
    item.lineTotal = multiplyMoney(found.variant.price, quantity);
    recalculate(cart);
    await this.carts.save(cart);
    return ok(cart);
  }

  async remove(ownerKey: string, itemId: string): Promise<Result<Cart>> {
    const cart = await this.get(ownerKey);
    const index = cart.items.findIndex((candidate) => candidate.id === itemId);
    if (index < 0) return err(new AppError("NOT_FOUND", "Không tìm thấy sản phẩm trong giỏ hàng", 404));
    cart.items.splice(index, 1);
    recalculate(cart);
    await this.carts.save(cart);
    return ok(cart);
  }
}

export function emptyCart(ownerKey: string): Cart { return { id: uuid("cart"), ownerKey, currency: "VND", items: [], subtotal: 0 as Vnd, updatedAt: new Date() }; }
export function recalculate(cart: Cart): void { cart.subtotal = addMoney(...cart.items.map((item) => item.lineTotal)); cart.updatedAt = new Date(); }

