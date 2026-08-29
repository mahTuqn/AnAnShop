"use server";

/** @deprecated Order transitions must use the guarded `/api/admin/orders/:id/transition` route.
 * Keeping this fail-closed export prevents older clients from bypassing lifecycle side effects. */
export async function updateOrderStatus(): Promise<never> {
  throw new Error("Direct order mutation is disabled; use the lifecycle transition API");
}