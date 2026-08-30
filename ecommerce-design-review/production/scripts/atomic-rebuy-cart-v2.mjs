import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

const method = [
  '  async addMany(ownerKey: string, lines: ReadonlyArray<{ variantId: string; quantity: number }>): Promise<Result<Cart>> {',
  '    if (lines.length === 0 || lines.length > 100) return err(new AppError("VALIDATION_ERROR", "Danh sách mua lại không hợp lệ", 400));',
  '    const cart = await this.get(ownerKey);',
  '    for (const line of lines) {',
  '      const quantity = positiveInt(line.quantity, "quantity");',
  '      const found = await this.catalog.findVariant(line.variantId);',
  '      if (!found || !found.variant.active) return err(new AppError("NOT_FOUND", "Biến thể không còn được bán", 404));',
  '      const current = cart.items.find((item) => item.variantId === line.variantId);',
  '      const nextQuantity = (current?.quantity ?? 0) + quantity;',
  '      if (nextQuantity > found.variant.available) return err(new AppError("OUT_OF_STOCK", `SKU ${found.variant.sku} không đủ tồn kho`, 409, { available: found.variant.available }));',
  '      if (current) { current.quantity = nextQuantity; current.unitPrice = found.variant.price; current.lineTotal = multiplyMoney(found.variant.price, nextQuantity); }',
  '      else cart.items.push({ id: uuid("ci"), variantId: found.variant.id, product: found.product, variantName: found.variant.name, sku: found.variant.sku, quantity, unitPrice: found.variant.price, lineTotal: multiplyMoney(found.variant.price, quantity) });',
  '    }',
  '    recalculate(cart);',
  '    await this.carts.save(cart);',
  '    return ok(cart);',
  '  }',
  '',
].join("\n");
replace("src/modules/cart/index.ts", "  async setQuantity(ownerKey: string", method + "  async setQuantity(ownerKey: string");

const actions = "src/app/api/orders/[id]/actions/route.ts";
let source = readFileSync(actions, "utf8");
const start = source.indexOf('      for (const item of order.items) {', source.indexOf('if (action === "REBUY")'));
const endMarker = '      return NextResponse.json({ data: { action, cart } });';
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("Sequential rebuy block not found");
const replacement = [
  '      const lines = order.items.map((item) => {',
  '        if (!item.variantId) throw new AppError("CONFLICT", `SKU ${item.sku} không còn biến thể để mua lại`, 409);',
  '        return { variantId: item.variantId, quantity: item.quantity };',
  '      });',
  '      const result = await runtime.cart.addMany(`user:${actor.userId}`, lines);',
  '      if (!result.ok) throw result.error;',
  '      return NextResponse.json({ data: { action, cart: result.value } });',
].join("\n");
source = source.slice(0, start) + replacement + source.slice(end + endMarker.length);
writeFileSync(actions, source, "utf8");
