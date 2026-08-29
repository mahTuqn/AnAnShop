import { NextRequest, NextResponse } from "next/server";
import { ownerFrom, safeRoute } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError } from "@/modules/shared";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const order = await runtime.store.findById((await context.params).id);
    const ownerKey = await ownerFrom(request);
    if (!order || order.ownerKey !== ownerKey) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng", 404);
    if (!process.env.DATABASE_URL) return NextResponse.json({ data: order });
    const db = getPrisma();
    const productRows = await db.$queryRawUnsafe<Array<{ id: string; slug: string }>>("SELECT id, slug FROM products WHERE id=ANY($1::uuid[])", order.items.map(i => i.productId));
    const slugMap = new Map(productRows.map(r => [r.id, r.slug]));
    const mappedItems = order.items.map(item => ({ ...item, productSlug: slugMap.get(item.productId) || item.productId }));
    
    // Tables shipments, order_status_events do not exist in this DB yet
    const shipments: unknown[] = [];
    const timeline: unknown[] = [];
    
    // Fetch return requests
    const returns = await db.$queryRawUnsafe<Array<{ id: string; status: string; reason: string; admin_note: string | null; requested_at: string; was_accepted: boolean }>>(
      `SELECT r.id, r.status, r.reason, r.admin_note, r.requested_at,
       EXISTS(SELECT 1 FROM return_items ri WHERE ri.return_request_id=r.id AND ri.condition IS NOT NULL) AS was_accepted
       FROM return_requests r WHERE r.order_id=$1::uuid ORDER BY r.requested_at DESC`, 
      order.id
    );
    
    return NextResponse.json({ data: { ...order, items: mappedItems, shipments, timeline, returns: returns.map(r => ({ id: r.id, status: r.status, reason: r.reason, adminNote: r.admin_note, requestedAt: r.requested_at, wasAccepted: r.was_accepted })) } });
  });
}