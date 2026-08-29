import { CheckoutClientV2 as CheckoutClient } from "@/components/storefront/checkout-client-v2";
export const metadata = { title: "Thanh toán" };
export default function CheckoutPage() { return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><p className="mb-8 text-center text-sm text-[#6b5e5e]">🔒 Thanh toán an toàn · Thông tin được bảo mật</p><CheckoutClient/></main>; }
