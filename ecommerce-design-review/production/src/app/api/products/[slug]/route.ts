import { NextResponse } from "next/server";
import { jsonResult, safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  return safeRoute(async () => jsonResult(await runtime.catalog.detail((await context.params).slug)));
}

