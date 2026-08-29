import type { Category, Order, Product } from "./types";

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=85`;

export const categoryLabels: Record<Category, string> = {
  maternity: "Đồ bầu",
  postpartum: "Sau sinh & cho bú",
  newborn: "Đồ sơ sinh",
  accessories: "Phụ kiện",
  gift: "Combo quà tặng",
};

export const products: Product[] = [
  {
    id: "prd_01", slug: "dam-bau-linen-that-no", name: "Đầm bầu linen thắt nơ", category: "maternity", categoryLabel: "Đồ bầu", price: 549000, compareAtPrice: 649000,
    image: photo("photo-1515886657613-9f3515b0c78f"), images: [photo("photo-1515886657613-9f3515b0c78f"), photo("photo-1496747611176-843222e1e57c")], badge: "Bán chạy",
    colors: [{ name: "Be tự nhiên", hex: "#d7c5ae" }, { name: "Xanh sage", hex: "#9dac98" }], sizes: [{ name: "S" }, { name: "M" }, { name: "L" }, { name: "XL" }],
    material: "Linen pha cotton", stage: "Ba tháng giữa", rating: 4.9, reviewCount: 124, description: "Dáng đầm suông mềm mại, thoáng nhẹ và linh hoạt theo thay đổi của cơ thể mẹ từ thai kỳ đến sau sinh.",
  },
  {
    id: "prd_02", slug: "ao-cho-bu-co-v-mem-mai", name: "Áo cho bú cổ V mềm mại", category: "postpartum", categoryLabel: "Sau sinh & cho bú", price: 329000,
    image: photo("photo-1529139574466-a303027c1d8b"), images: [photo("photo-1529139574466-a303027c1d8b"), photo("photo-1542291026-7eec264c27ff")], badge: "Mới về",
    colors: [{ name: "Kem", hex: "#eee4d8" }, { name: "Hồng đất", hex: "#b98286" }], sizes: [{ name: "S" }, { name: "M" }, { name: "L" }, { name: "XL" }],
    material: "Modal cotton", stage: "Sau sinh", rating: 4.8, reviewCount: 86, description: "Thiết kế mở ngực kín đáo giúp mẹ cho bé bú thuận tiện, chất vải mát và co giãn nhẹ.",
  },
  {
    id: "prd_03", slug: "bo-lien-than-so-sinh-cotton", name: "Bộ liền thân sơ sinh cotton", category: "newborn", categoryLabel: "Đồ sơ sinh", price: 239000,
    image: photo("photo-1515488042361-ee00e0ddd4e4"), images: [photo("photo-1515488042361-ee00e0ddd4e4"), photo("photo-1596870230751-ebdfce98ec42")], badge: "Organic",
    colors: [{ name: "Trắng sữa", hex: "#f5f1e8" }, { name: "Cam nhạt", hex: "#e7b990" }], sizes: [{ name: "0–3M" }, { name: "3–6M" }, { name: "6–9M" }],
    material: "Cotton hữu cơ", stage: "0–9 tháng", rating: 4.9, reviewCount: 203, description: "Cotton hữu cơ mềm lành, khuy bấm tiện thay tã và đường may phẳng bảo vệ làn da nhạy cảm của bé.",
  },
  {
    id: "prd_04", slug: "quan-bau-cong-so-co-gian", name: "Quần bầu công sở co giãn", category: "maternity", categoryLabel: "Đồ bầu", price: 459000, compareAtPrice: 519000,
    image: photo("photo-1594633312681-425c7b97ccd1"), images: [photo("photo-1594633312681-425c7b97ccd1"), photo("photo-1506629082955-511b1aa562c8")], badge: "-12%",
    colors: [{ name: "Đen", hex: "#332f30" }, { name: "Be", hex: "#c6b89f" }], sizes: [{ name: "M" }, { name: "L" }, { name: "XL" }],
    material: "Rayon spandex", stage: "Ba tháng cuối", rating: 4.8, reviewCount: 91, description: "Cạp bụng nâng đỡ nhẹ, phom đứng thanh lịch phù hợp đi làm và gặp gỡ hằng ngày.",
  },
  {
    id: "prd_05", slug: "khan-quan-so-sinh-organic", name: "Khăn quấn sơ sinh organic", category: "newborn", categoryLabel: "Đồ sơ sinh", price: 189000,
    image: photo("photo-1544126592-807ade215a0b"), images: [photo("photo-1544126592-807ade215a0b")],
    colors: [{ name: "Kem", hex: "#e9dfcc" }, { name: "Xanh nhạt", hex: "#bfced0" }], sizes: [{ name: "Freesize" }],
    material: "Muslin organic", stage: "0–6 tháng", rating: 4.9, reviewCount: 146, description: "Khăn muslin bốn lớp thoáng khí, mềm hơn sau mỗi lần giặt và đa năng khi chăm bé.",
  },
  {
    id: "prd_06", slug: "combo-chao-doi-be-yeu", name: "Combo Chào đời bé yêu", category: "gift", categoryLabel: "Combo quà tặng", price: 899000, compareAtPrice: 1099000,
    image: photo("photo-1601979031925-424e53b6caaa"), images: [photo("photo-1601979031925-424e53b6caaa")], badge: "Tiết kiệm 18%",
    colors: [{ name: "Trung tính", hex: "#d7c8b9" }], sizes: [{ name: "0–3M" }, { name: "3–6M" }],
    material: "Cotton hữu cơ", stage: "0–6 tháng", rating: 5, reviewCount: 38, description: "Bộ quà tặng chỉn chu gồm bodysuit, khăn quấn, mũ, bao tay chân và thiệp chúc mừng.",
  },
];

export const orders: Order[] = [
  { code: "AN24082718", date: "27/08/2026", status: "shipping", total: 579000, items: [{ productId: "prd_01", quantity: 1, size: "M", color: "Be tự nhiên" }] },
  { code: "AN24081907", date: "19/08/2026", status: "delivered", total: 478000, items: [{ productId: "prd_03", quantity: 2, size: "0–3M", color: "Trắng sữa" }] },
];

export const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
export const findProduct = (slug: string) => products.find((product) => product.slug === slug);
