import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "content.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT c.id,c.type,c.status,c.slug,c.title,c.excerpt,c.featured_image_url,c.published_at,c.updated_at,u.full_name AS author_name
    FROM content_entries c LEFT JOIN users u ON u.id=c.author_id ORDER BY c.updated_at DESC OFFSET $1 LIMIT $2`, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM content_entries");
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

export const POST = (request: NextRequest) => adminRoute(request, "content.write", async ({ db, actor }) => {
  const body = object(await request.json());
  const type = stringField(body, "type", { max: 20 })!;
  if (!["PAGE", "ARTICLE", "BANNER"].includes(type)) throw new AppError("VALIDATION_ERROR", "Loại nội dung không hợp lệ", 400);
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`INSERT INTO content_entries(type,status,slug,title,excerpt,body,featured_image_url,seo_title,seo_description,author_id)
    VALUES($1::content_type,'DRAFT',$2,$3,$4,$5::jsonb,$6,$7,$8,$9::uuid) RETURNING *`, type,
    stringField(body, "slug", { max: 220 })!, stringField(body, "title", { max: 250 })!, stringField(body, "excerpt", { optional: true }),
    JSON.stringify(body.body ?? {}), stringField(body, "featuredImageUrl", { optional: true }), stringField(body, "seoTitle", { optional: true, max: 70 }),
    stringField(body, "seoDescription", { optional: true, max: 170 }), actor.userId);
  const item = rows[0];
  return { data: item, status: 201, audit: { action: "CONTENT_CREATED", entityType: "CONTENT_ENTRY", entityId: String(item.id), after: item } };
});
