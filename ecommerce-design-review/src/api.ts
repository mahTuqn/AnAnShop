// API client — tất cả fetch calls tới backend
// Chạy trong trình duyệt, /api/* được proxy tới Express server

const BASE = "/api";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; success: boolean; pagination?: { total: number; page: number; limit: number; totalPages: number } }> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const json = await res.json();
  return json;
}

// Auth
export const api = {
  auth: {
    register: (body: { fullName: string; email?: string; phone?: string; password: string }) =>
      apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { login: string; password: string }) =>
      apiFetch<{ user: { id: string; fullName: string; email: string; phone: string; roles: string[] } }>(
        "/auth/login", { method: "POST", body: JSON.stringify(body) }
      ),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    me: () => apiFetch<{ id: string; fullName: string; email: string; phone: string; roles: string[] }>("/auth/me"),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
  },
  warehouses: {
    list: () => apiFetch<any[]>("/warehouses"),
    create: (body: { code: string; name: string; address: string; city: string }) => 
      apiFetch("/warehouses", { method: "POST", body: JSON.stringify(body) }),
    inventory: (productId: string) => apiFetch<any[]>(`/warehouses/inventory/${productId}`),
    transfer: (body: { fromWarehouseId: string; toWarehouseId: string; variantId: string; quantity: number }) => 
      apiFetch("/warehouses/transfer", { method: "POST", body: JSON.stringify(body) }),
  },

  catalog: {
    products: (params?: Record<string, string | number>) => {
      const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return apiFetch<unknown[]>(`/catalog/products${q}`);
    },
    product: (slug: string) => apiFetch<Record<string, unknown>>(`/catalog/products/${slug}`),
    categories: () => apiFetch<unknown[]>("/catalog/categories"),
  },

  cart: {
    get: (sessionId?: string) =>
      apiFetch<{ cartId: string; items: unknown[]; subtotal: number }>("/cart", {
        headers: sessionId ? { "x-session-id": sessionId } : {},
      }),
    add: (body: { variantId: string; quantity: number }, sessionId?: string) =>
      apiFetch("/cart", { method: "POST", body: JSON.stringify(body), headers: sessionId ? { "x-session-id": sessionId } : {} }),
    update: (itemId: string, quantity: number) =>
      apiFetch(`/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    remove: (itemId: string) => apiFetch(`/cart/${itemId}`, { method: "DELETE" }),
    merge: (guestSessionId: string) =>
      apiFetch("/cart/merge", { method: "POST", body: JSON.stringify({ guestSessionId }) }),
  },

  checkout: {
    quote: (body: unknown) => apiFetch<{ subtotal: number; shippingFee: number; discountTotal: number; grandTotal: number; couponError?: string }>(
      "/checkout/quote", { method: "POST", body: JSON.stringify(body) }
    ),
    placeOrder: (body: unknown) => apiFetch<{ orderCode: string }>("/checkout", { method: "POST", body: JSON.stringify(body) }),
  },

  orders: {
    list: (page = 1) => apiFetch(`/orders?page=${page}`),
    get: (code: string, phone?: string) => apiFetch(`/orders/${code}${phone ? `?phone=${phone}` : ""}`),
    cancel: (code: string) => apiFetch(`/orders/${code}/cancel`, { method: "PATCH" }),
    requestReturn: (body: unknown) => apiFetch("/orders/returns", { method: "POST", body: JSON.stringify(body) }),
  },

  account: {
    get: () => apiFetch("/account"),
    update: (body: unknown) => apiFetch("/account", { method: "PATCH", body: JSON.stringify(body) }),
    addresses: {
      list: () => apiFetch("/account/addresses"),
      add: (body: unknown) => apiFetch("/account/addresses", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: unknown) => apiFetch(`/account/addresses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      delete: (id: string) => apiFetch(`/account/addresses/${id}`, { method: "DELETE" }),
    },
    wishlist: {
      list: () => apiFetch("/account/wishlist"),
      add: (productId: string) => apiFetch(`/account/wishlist/${productId}`, { method: "POST" }),
      remove: (productId: string) => apiFetch(`/account/wishlist/${productId}`, { method: "DELETE" }),
    },
    review: (body: unknown) => apiFetch("/account/reviews", { method: "POST", body: JSON.stringify(body) }),
  },

  admin: {
    dashboard: () => apiFetch("/admin/dashboard"),
    orders: {
      list: (params?: Record<string, string>) => apiFetch(`/admin/orders?${new URLSearchParams(params).toString()}`),
      update: (id: string, body: unknown) => apiFetch(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    products: {
      list: (params?: Record<string, string>) => apiFetch(`/admin/products?${new URLSearchParams(params).toString()}`),
      create: (body: unknown) => apiFetch("/admin/products", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: unknown) => apiFetch(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    inventory: {
      list: (params?: Record<string, string>) => apiFetch(`/admin/inventory?${new URLSearchParams(params).toString()}`),
      adjust: (id: string, body: unknown) => apiFetch(`/admin/inventory/${id}/adjust`, { method: "POST", body: JSON.stringify(body) }),
    },
    customers: {
      list: (params?: Record<string, string>) => apiFetch(`/admin/customers?${new URLSearchParams(params).toString()}`),
      update: (id: string, body: unknown) => apiFetch(`/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    promotions: {
      list: () => apiFetch("/admin/promotions"),
      create: (body: unknown) => apiFetch("/admin/promotions", { method: "POST", body: JSON.stringify(body) }),
    },
    reviews: {
      list: (params?: Record<string, string>) => apiFetch(`/admin/reviews?${new URLSearchParams(params).toString()}`),
      update: (id: string, status: string) => apiFetch(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    },
    staff: {
      list: () => apiFetch("/admin/staff"),
      assignRole: (userId: string, roleId: string, action: "assign" | "revoke") =>
        apiFetch(`/admin/staff/${userId}/roles`, { method: "POST", body: JSON.stringify({ roleId, action }) }),
    },
    returns: {
      list: () => apiFetch("/admin/returns"),
      update: (id: string, body: unknown) => apiFetch(`/admin/returns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    audit: (params?: Record<string, string>) => apiFetch(`/admin/audit?${new URLSearchParams(params).toString()}`),
    settings: {
      get: () => apiFetch("/admin/settings"),
      update: (body: unknown) => apiFetch("/admin/settings", { method: "PATCH", body: JSON.stringify(body) }),
    },
    reports: {
      revenue: (from?: string, to?: string) => apiFetch(`/admin/reports/revenue${from ? `?from=${from}&to=${to}` : ""}`),
    },
  },
};
