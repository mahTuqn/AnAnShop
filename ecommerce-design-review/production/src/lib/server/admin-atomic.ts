import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminActor, AuditEntry } from "./admin";
import { requireAdmin } from "./admin";
import { getPrisma } from "./prisma";
import { safeRoute } from "./http";

export interface AtomicMutationResult { data: unknown; status?: number; audit?: AuditEntry }

/** Runs domain mutation and its audit insert in the same PostgreSQL transaction. */
export function adminAtomicMutationRoute(
  request: NextRequest,
  permission: string,
  operation: (context: { tx: Prisma.TransactionClient; actor: AdminActor }) => Promise<AtomicMutationResult>,
): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAdmin(request, permission);
    const db = getPrisma();
    const result = await db.$transaction(async (tx) => {
      const mutation = await operation({ tx, actor });
      if (mutation.audit) await insertAudit(tx, actor, request, mutation.audit);
      return mutation;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: result.data }, { status: result.status ?? 200 });
  });
}

async function insertAudit(tx: Prisma.TransactionClient, actor: AdminActor, request: NextRequest, entry: AuditEntry): Promise<void> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded && isIP(forwarded) ? forwarded : null;
  await tx.$executeRawUnsafe(`INSERT INTO audit_logs
    (actor_user_id,action,entity_type,entity_id,before_data,after_data,ip_address,user_agent)
    VALUES ($1::uuid,$2,$3,$4::uuid,$5::jsonb,$6::jsonb,$7::inet,$8)`,
    actor.userId, entry.action, entry.entityType, entry.entityId ?? null,
    JSON.stringify(entry.before ?? null), JSON.stringify(entry.after ?? null), ip,
    request.headers.get("user-agent"),
  );
}

