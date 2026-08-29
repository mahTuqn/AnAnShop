import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, optionalHttpsUrl } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { AppError, object, stringField } from "@/modules/shared";

const select = { id: true, email: true, phone: true, fullName: true, avatarUrl: true, status: true } as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const user = await requirePersistentDatabase().user.findFirst({ where: { id: actor.userId, deletedAt: null }, select });
    return NextResponse.json({ data: user }, { headers: { "cache-control": "no-store" } });
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const body = object(await request.json());
    const fullName = stringField(body, "fullName", { optional: true, min: 2, max: 150 });
    const phone = stringField(body, "phone", { optional: true, min: 9, max: 20 });
    const avatarUrl = optionalHttpsUrl(body.avatarUrl, "avatarUrl");
    if (fullName === undefined && phone === undefined && avatarUrl === undefined) throw new AppError("VALIDATION_ERROR", "Không có trường hồ sơ nào để cập nhật", 400);
    const user = await requirePersistentDatabase().user.update({ where: { id: actor.userId }, data: { fullName, phone, avatarUrl }, select });
    return NextResponse.json({ data: user }, { headers: { "cache-control": "no-store" } });
  });
}
