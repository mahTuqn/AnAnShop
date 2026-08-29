/**
 * Stable HTTP contracts for the admin frontend. Implementations must enforce
 * authentication, permission checks, validation and auditing on the server.
 */
export type AdminListQuery = {
  query?: string;
  status?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
};

export type AdminListResponse<T> = {
  data: T[];
  page: { nextCursor: string | null; total: number };
  requestId: string;
};

export type AdminMutationResponse<T> = {
  data: T;
  requestId: string;
  auditLogId: string;
};

export type AdminErrorResponse = {
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
  requestId: string;
};

export type OrderAdminStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED";
export type ReviewAdminStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReturnAdminStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CLOSED";

export type OrderStatusCommand = { status: OrderAdminStatus; reason?: string; version: number };
export type InventoryAdjustmentCommand = { quantity: number; type: "PURCHASE" | "RETURN" | "ADJUSTMENT"; reason: string; idempotencyKey: string };
export type ReviewModerationCommand = { status: Exclude<ReviewAdminStatus, "PENDING">; reason?: string };
export type ReturnDecisionCommand = { status: Extract<ReturnAdminStatus, "APPROVED" | "REJECTED" | "RECEIVED">; note?: string; version: number };
export type RefundCommand = { returnRequestId: string; amount: number; reason: string; idempotencyKey: string };

export const adminApi = {
  dashboard: "/api/admin/dashboard",
  orders: "/api/admin/orders",
  products: "/api/admin/products",
  categories: "/api/admin/categories",
  inventory: "/api/admin/inventory",
  customers: "/api/admin/customers",
  promotions: "/api/admin/promotions",
  reviews: "/api/admin/reviews",
  content: "/api/admin/content",
  reports: "/api/admin/reports",
  settings: "/api/admin/settings",
  audit: "/api/admin/audit",
  returns: "/api/admin/returns",
  refunds: "/api/admin/refunds",
  staff: "/api/admin/staff",
  roles: "/api/admin/roles",
} as const;

export const requiredAdminPermissions = {
  dashboard: "dashboard:read",
  orders: "orders:read",
  orderUpdate: "orders:update",
  products: "products:write",
  inventoryAdjust: "inventory:adjust",
  returnsDecide: "returns:decide",
  refundsCreate: "refunds:create",
  customers: "customers:read",
  promotions: "promotions:write",
  reviews: "reviews:moderate",
  content: "content:write",
  reports: "reports:read",
  settings: "settings:update",
  audit: "audit:read",
  access: "access:manage",
} as const;
