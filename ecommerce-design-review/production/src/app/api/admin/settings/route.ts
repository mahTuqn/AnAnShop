import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { object, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "settings.write", async ({ db }) => {
  const settings = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT id,key,value,description,is_public,updated_at FROM store_settings ORDER BY key");
  return { data: settings };
});

export const PATCH = (request: NextRequest) => adminRoute(request, "settings.write", async ({ db, actor }) => {
  const body = object(await request.json());
  const key = stringField(body, "key", { max: 100 })!;
  const beforeRows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM store_settings WHERE key=$1", key);
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`INSERT INTO store_settings(key,value,description,is_public,updated_by)
    VALUES ($1,$2::jsonb,$3,$4,$5::uuid)
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,description=EXCLUDED.description,is_public=EXCLUDED.is_public,updated_by=EXCLUDED.updated_by
    RETURNING *`, key, JSON.stringify(body.value ?? {}), stringField(body, "description", { optional: true, max: 255 }) ?? null, body.isPublic === true, actor.userId);
  const setting = rows[0];
  return { data: setting, audit: { action: "STORE_SETTING_CHANGED", entityType: "STORE_SETTING", entityId: String(setting.id), before: beforeRows[0], after: setting } };
});

