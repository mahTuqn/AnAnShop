export type ProductSize = {
  name: string;
  stock: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: "maternity" | "postpartum" | "newborn" | "accessories" | "gift";
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  images: string[];
  badge?: string;
  tone: string;
  colors: { name: string; value: string }[];
  sizes: ProductSize[];
  stage: string;
  material: string;
  rating: number;
  reviews: number;
  description: string;
};

export type CartItem = {
  productId: number;
  size: string;
  color: string;
  quantity: number;
};

export type Address = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  ward: string;
  line1: string;
  isDefault?: boolean;
};

export type OrderStatus = "pending" | "processing" | "shipping" | "delivered" | "cancelled";

export type Order = {
  code: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";
  items: CartItem[];
  total: number;
  customer: string;
  address: string;
  payment: string;
  shipping: string;
};

export type ToastMessage = {
  type: "success" | "error" | "info";
  message: string;
};
