import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { addressInput } from "../route";
import { AppError, object } from "@/modules/shared";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const id = uuidParam((await context.params).id, "addressId"); const db = requirePersistentDatabase();
    const current = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM addresses WHERE id=$1::uuid AND user_id=$2::uuid", id, actor.userId);
    if (!current[0]) throw new AppError("NOT_FOUND", "Không tìm thấy địa chỉ", 404);
    const body = object(await request.json());
    const merged = addressInput({ ...camelAddress(current[0]), ...body });
    const row = await db.$transaction(async (tx) => {
      if (merged.isDefault) await tx.$executeRawUnsafe("UPDATE addresses SET is_default=FALSE WHERE user_id=$1::uuid AND id<>$2::uuid AND is_default=TRUE", actor.userId, id);
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`UPDATE addresses SET label=$3,full_name=$4,phone=$5,province=$6,district=$7,ward=$8,line1=$9,postal_code=$10,is_default=$11,updated_at=NOW()
        WHERE id=$1::uuid AND user_id=$2::uuid RETURNING *`, id, actor.userId, merged.label, merged.fullName, merged.phone, merged.province, merged.district, merged.ward, merged.line1, merged.postalCode, merged.isDefault);
      return rows[0];
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: row });
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const id = uuidParam((await context.params).id, "addressId");
    const db = requirePersistentDatabase();
    const rows = await db.$transaction(async (tx) => {
      const deleted = await tx.$queryRawUnsafe<Array<{ id: string; is_default: boolean }>>("DELETE FROM addresses WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id,is_default", id, actor.userId);
      if (deleted[0]?.is_default) await tx.$executeRawUnsafe("UPDATE addresses SET is_default=TRUE WHERE id=(SELECT id FROM addresses WHERE user_id=$1::uuid ORDER BY updated_at DESC LIMIT 1)", actor.userId);
      return deleted;
    }, { isolationLevel: "Serializable" });
    if (!rows[0]) throw new AppError("NOT_FOUND", "Không tìm thấy địa chỉ", 404);
    return NextResponse.json({ data: { deleted: true, id } });
  });
}

const camelAddress = (row: Record<string, unknown>) => ({ label: row.label, fullName: row.full_name, phone: row.phone, province: row.province, district: row.district, ward: row.ward, line1: row.line1, postalCode: row.postal_code, isDefault: row.is_default });
