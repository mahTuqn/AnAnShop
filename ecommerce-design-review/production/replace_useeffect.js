import fs from "fs";
const file = "src/components/storefront/checkout-client-v2.tsx";
let content = fs.readFileSync(file, "utf8");

const oldStr = `  useEffect(() => {
    apiRequest<ApiCart>("/api/cart", { method: "GET" }).then(setCart).catch((reason) => { setLoadError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng."); setCart({ items: [], subtotal: 0 }); });`;

const newStr = `  const buyNowParam = searchParams.get("buyNow");
  const qtyParam = searchParams.get("qty") || "1";

  useEffect(() => {
    if (buyNowParam) {
      apiRequest<ApiCart>(\`/api/checkout/preview?variantId=\${buyNowParam}&qty=\${qtyParam}\`, { method: "GET" }).then(setCart).catch((reason) => { setLoadError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm mua ngay."); setCart({ items: [], subtotal: 0 }); });
    } else {
      apiRequest<ApiCart>("/api/cart", { method: "GET" }).then(setCart).catch((reason) => { setLoadError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng."); setCart({ items: [], subtotal: 0 }); });
    }`;

content = content.replace(oldStr, newStr);
content = content.replace("  }, []);", "  }, [buyNowParam, qtyParam]);");
fs.writeFileSync(file, content);
