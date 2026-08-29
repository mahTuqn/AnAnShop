export type Category = "maternity" | "postpartum" | "newborn" | "accessories" | "gift";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  categoryLabel: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images: string[];
  badge?: string;
  colors: { name: string; hex: string }[];
  sizes: { name: string; variantId?: string }[];
  material: string;
  stage: string;
  rating: number;
  reviewCount: number;
  description: string;
  brand?: string;
};

export type OrderStatus = "processing" | "shipping" | "delivered" | "cancelled";
export type Order = {
  code: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: { productId: string; quantity: number; size: string; color: string }[];
};
