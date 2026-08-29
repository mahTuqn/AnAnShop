"use server";

import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";
import { revalidatePath } from "next/cache";

export async function createPromotion(data: {
  code: string;
  name: string;
  type: string;
  value: number;
  minimumOrder: number;
  usageLimit: number;
  startsAt: string;
  endsAt: string;
}) {
  await requireAdminPageSession("/admin/promotions", "promotions.write");
  const db = getPrisma();
  
  const existing = await db.coupon.findFirst({ where: { code: data.code.toUpperCase() } });
  if (existing) {
    throw new Error("Mã khuyến mãi đã tồn tại");
  }

  await db.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      type: data.type as any,
      value: data.value,
      minimumOrder: data.minimumOrder,
      usageLimit: data.usageLimit > 0 ? data.usageLimit : null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      active: true,
      scope: "ORDER",
    }
  });

  revalidatePath("/admin/promotions");
  return { success: true };
}

export async function togglePromotionStatus(id: string, active: boolean) {
  await requireAdminPageSession("/admin/promotions", "promotions.write");
  const db = getPrisma();
  await db.coupon.update({
    where: { id },
    data: { active }
  });
  revalidatePath("/admin/promotions");
}

export async function updatePromotion(id: string, data: {
  code: string;
  name: string;
  type: string;
  value: number;
  minimumOrder: number;
  usageLimit: number;
  startsAt: string;
  endsAt: string;
}) {
  await requireAdminPageSession("/admin/promotions", "promotions.write");
  const db = getPrisma();
  
  const existing = await db.coupon.findFirst({ where: { code: data.code.toUpperCase(), NOT: { id } } });
  if (existing) {
    throw new Error("Mã khuyến mãi đã tồn tại");
  }

  await db.coupon.update({
    where: { id },
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      type: data.type as any,
      value: data.value,
      minimumOrder: data.minimumOrder,
      usageLimit: data.usageLimit > 0 ? data.usageLimit : null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    }
  });

  revalidatePath("/admin/promotions");
  return { success: true };
}
