import { NextRequest, NextResponse } from "next/server";
import { ownerFrom, safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => NextResponse.json({ data: await runtime.store.listByOwner(await ownerFrom(request)) }));
}

