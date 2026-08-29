"use client";
type ApiEnvelope<T> = { data?: T; error?: { message?: string; code?: string } };
const guestKey = "anan_guest_session";
const tokenKey = "anan_auth_token";
function guestSession(): string { const current = window.localStorage.getItem(guestKey); if (current) return current; const value = `guest_${crypto.randomUUID()}`; window.localStorage.setItem(guestKey, value); return value; }
export function apiHeaders(json = true): HeadersInit { const token = window.localStorage.getItem(tokenKey); return { ...(json ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : { "x-session-id": guestSession() }) }; }
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> { const response = await fetch(path, { ...init, headers: { ...apiHeaders(init.body !== undefined), ...init.headers } }); const payload = await response.json().catch(() => ({})) as ApiEnvelope<T>; if (!response.ok || payload.error) throw new Error(payload.error?.message || "Không thể kết nối đến An An. Mẹ vui lòng thử lại."); return payload.data as T; }
export function saveAuthToken(token: string) { window.localStorage.setItem(tokenKey, token); }
export type ApiCart = { items: { id: string; variantId: string; product: { id: string; slug: string; name: string; imageUrl?: string }; variantName: string; quantity: number; unitPrice: number; lineTotal: number }[]; subtotal: number };
export type ApiCheckout = { order: { id: string; code: string; grandTotal: number }; payment: { status: string; redirectUrl?: string }; replayed: boolean };
