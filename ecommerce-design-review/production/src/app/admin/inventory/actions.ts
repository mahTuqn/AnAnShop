"use server";

import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";
import { revalidatePath } from "next/cache";

export async function updateInventory(variantId: string, onHand: number) {
  await requireAdminPageSession("/admin/inventory", "inventory.write");
  const db = getPrisma();
  
  await db.inventoryItem.update({
    where: { variantId },
    data: { onHand, updatedAt: new Date() }
  });

  revalidatePath("/admin/inventory");
  return { success: true };
}
