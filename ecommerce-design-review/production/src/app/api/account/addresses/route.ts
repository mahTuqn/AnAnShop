import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { object, stringField } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const rows = await requirePersistentDatabase().$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT id,label,full_name,phone,province,district,ward,line1,postal_code,is_default,created_at,updated_at FROM addresses WHERE user_id=$1::uuid ORDER BY is_default DESC,updated_at DESC", actor.userId);
    return NextResponse.json({ data: rows }, { headers: { "cache-control": "no-store" } });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const body = object(await request.json());
    const value = addressInput(body);
    const db = requirePersistentDatabase();
    const row = await db.$transaction(async (tx) => {
      const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM addresses WHERE user_id=$1::uuid", actor.userId);
      value.isDefault = value.isDefault || Number(count) === 0;
      if (value.isDefault) await tx.$executeRawUnsafe("UPDATE addresses SET is_default=FALSE WHERE user_id=$1::uuid AND is_default=TRUE", actor.userId);
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`INSERT INTO addresses(user_id,label,full_name,phone,province,district,ward,line1,postal_code,is_default)
        VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, actor.userId, value.label, value.fullName, value.phone, value.province, value.district, value.ward, value.line1, value.postalCode, value.isDefault);
      return rows[0];
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: row }, { status: 201 });
  });
}

export function addressInput(body: Record<string, unknown>) {
  return {
    label: stringField(body, "label", { optional: true, max: 50 }) ?? null,
    fullName: stringField(body, "fullName", { min: 2, max: 150 })!,
    phone: stringField(body, "phone", { min: 9, max: 20 })!,
    province: stringField(body, "province", { max: 100 })!,
    district: stringField(body, "district", { max: 100 })!,
    ward: stringField(body, "ward", { max: 100 })!,
    line1: stringField(body, "line1", { max: 255 })!,
    postalCode: stringField(body, "postalCode", { optional: true, max: 20 }) ?? null,
    isDefault: body.isDefault === true,
  };
}
