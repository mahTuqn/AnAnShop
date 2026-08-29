import { CartClientV2 as CartClient } from "@/components/storefront/cart-client-v2";
export const metadata = { title: "Giỏ hàng" };
export default function CartPage() { return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="mb-10 flex items-end justify-between"><div><p className="text-xs font-semibold tracking-[.2em] text-[#8a493d]">MUA SẮM AN TÂM</p><h1 className="mt-2 font-serif text-4xl">Giỏ hàng</h1></div><a href="/products" className="text-sm text-[#713c33] underline">Tiếp tục mua sắm</a></div><CartClient/></main>; }
