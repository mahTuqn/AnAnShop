import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { AppError, object, stringField } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const items = await requirePersistentDatabase().$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT id,channel,template_code,payload,status,sent_at,read_at,created_at FROM notifications WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 100", actor.userId);
    return NextResponse.json({ data: { items } }, { headers: { "cache-control": "no-store" } });
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const body = object(await request.json());
    const id = uuidParam(stringField(body, "id", { max: 50 })!, "notificationId");
    if (body.read !== true) throw new AppError("VALIDATION_ERROR", "read phải bằng true", 400);
    const rows = await requirePersistentDatabase().$queryRawUnsafe<Array<{ id: string }>>("UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id", id, actor.userId);
    if (!rows[0]) throw new AppError("NOT_FOUND", "Không tìm thấy thông báo", 404);
    return NextResponse.json({ data: { id, read: true } });
  });
}
