import { readFile, writeFile } from "node:fs/promises";

const replace = async (file, before, after) => {
  const source = await readFile(file, "utf8");
  if (!source.includes(before)) throw new Error(`Expected text not found in ${file}`);
  await writeFile(file, source.replace(before, after), "utf8");
};

await replace(
  "src/components/storefront/checkout-client-v2.tsx",
  'const [payment, setPayment] = useState("COD");\n  const [shipping, setShipping] = useState("standard");',
  'const [payment, setPayment] = useState("COD");\n  const shipping = "standard";'
);
await replace(
  "src/components/storefront/checkout-client-v2.tsx",
  'const shipFee = shipping === "express" ? 45000 : (cart?.subtotal ?? 0) >= 699000 ? 0 : 30000;',
  'const shipFee = (cart?.subtotal ?? 0) >= 699000 ? 0 : 30000;'
);
await replace(
  "src/components/storefront/checkout-client-v2.tsx",
  '{[["standard", "Giao hàng tiêu chuẩn", "2–4 ngày", cart.subtotal >= 699000 ? 0 : 30000], ["express", "Giao hàng nhanh", "1–2 ngày", 45000]].map(([value, label, copy, price]) => <label className={`flex cursor-pointer gap-4 rounded-2xl border p-5 ${shipping === value ? "border-[#713c33] bg-[#fffaf7]" : "border-[#d9d0cb]"}`} key={String(value)}><input type="radio" name="shipping" checked={shipping === value} onChange={() => setShipping(String(value))}/><span className="flex-1"><strong>{label}</strong><span className="block text-sm text-[#6d625d]">{copy}</span></span><strong>{Number(price) ? money(Number(price)) : "Miễn phí"}</strong></label>)}',
  '{[["standard", "Giao hàng tiêu chuẩn", "2–4 ngày", cart.subtotal >= 699000 ? 0 : 30000]].map(([value, label, copy, price]) => <label className="flex cursor-pointer gap-4 rounded-2xl border border-[#713c33] bg-[#fffaf7] p-5" key={String(value)}><input type="radio" name="shipping" checked readOnly/><span className="flex-1"><strong>{label}</strong><span className="block text-sm text-[#6d625d]">{copy}</span></span><strong>{Number(price) ? money(Number(price)) : "Miễn phí"}</strong></label>)}<p className="mt-3 text-sm text-[#6d625d]">Giao hàng nhanh đang được hoàn thiện và sẽ sớm khả dụng.</p>'
);
await replace(
  "src/components/storefront/checkout-client-v2.tsx",
  '{[["COD", "Thanh toán khi nhận hàng"], ["MOMO", "Ví MoMo"], ["VNPAY", "VNPay"]].map(([value, label]) => <label className={`flex cursor-pointer gap-4 rounded-2xl border p-5 ${payment === value ? "border-[#713c33] bg-[#fffaf7]" : "border-[#d9d0cb]"}`} key={value}><input type="radio" name="payment" checked={payment === value} onChange={() => setPayment(value)}/><strong>{label}</strong></label>)}',
  '{[{ value: "COD", label: "Thanh toán khi nhận hàng", enabled: true }, { value: "MOMO", label: "Ví MoMo", enabled: false }, { value: "VNPAY", label: "VNPay", enabled: false }].map((option) => <label className={`flex gap-4 rounded-2xl border p-5 ${option.enabled ? "cursor-pointer" : "cursor-not-allowed bg-[#f5f2f0] text-[#766c67]"} ${payment === option.value ? "border-[#713c33] bg-[#fffaf7]" : "border-[#d9d0cb]"}`} key={option.value}><input type="radio" name="payment" checked={payment === option.value} disabled={!option.enabled} onChange={() => setPayment(option.value)}/><strong>{option.label}{!option.enabled && <span className="ml-2 text-xs font-normal">Sắp ra mắt</span>}</strong></label>)}'
);

await replace(
  "src/lib/storefront/adapters-api.ts",
  'postpartum: "postpartum", "sau-sinh": "postpartum", "cho-bu": "postpartum",\n  newborn: "newborn", "do-so-sinh": "newborn",\n  accessories: "accessories", "phu-kien": "accessories",\n  gift: "gift", "qua-tang": "gift", combo: "gift",',
  'postpartum: "postpartum", "sau-sinh": "postpartum", "cho-bu": "postpartum", "sau-sinh-cho-bu": "postpartum",\n  newborn: "newborn", "do-so-sinh": "newborn",\n  accessories: "accessories", "phu-kien": "accessories",\n  gift: "gift", "qua-tang": "gift", combo: "gift", "combo-qua-tang": "gift",'
);
await replace(
  "src/lib/storefront/adapters-api.ts",
  'const requestedCategory = query.category ? Object.entries(categoryAliases).find(([, value]) => value === query.category)?.[0] ?? query.category : undefined;',
  'const backendCategories: Record<string, string> = { maternity: "do-bau", postpartum: "sau-sinh-cho-bu", newborn: "do-so-sinh", accessories: "phu-kien", gift: "combo-qua-tang" };\n  const requestedCategory = query.category ? backendCategories[query.category] ?? query.category : undefined;'
);

await replace(
  "src/app/(storefront)/products/page.tsx",
  '<form><select name="sort"',
  '<form>{Object.entries(query).filter(([key, value]) => key !== "sort" && value).map(([key, value]) => <input type="hidden" name={key} value={value} key={key}/>) }<select name="sort"'
);

console.log("Refined shipping/payment availability and catalog query contracts.");
