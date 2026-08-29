import { NextRequest, NextResponse } from "next/server";
import { runtime } from "@/lib/server/runtime-selected";
import { safeRoute } from "@/lib/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const params = request.nextUrl.searchParams;
    const result = await runtime.catalog.list({ search: params.get("q") ?? undefined, category: params.get("category") ?? undefined, featured: params.has("featured") ? params.get("featured") === "true" : undefined, page: Number(params.get("page") ?? 1), pageSize: Number(params.get("pageSize") ?? 20) });
    return NextResponse.json({ data: result.items, meta: { page: result.page, pageSize: result.pageSize, total: result.total } });
  });
}

