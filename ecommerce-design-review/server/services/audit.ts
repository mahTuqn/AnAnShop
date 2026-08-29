// Audit log service — write to audit_logs table
import type pg from "pg";
import { pool } from "../lib/db.js";

export interface AuditEvent {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAudit(event: AuditEvent, client?: pg.PoolClient): Promise<void> {
  const db = client ?? pool;
  await db.query(
    `INSERT INTO audit_logs
      (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
    [
      event.actorUserId ?? null,
      event.action,
      event.entityType,
      event.entityId ?? null,
      event.beforeData ? JSON.stringify(event.beforeData) : null,
      event.afterData ? JSON.stringify(event.afterData) : null,
      event.ipAddress ?? null,
      event.userAgent ?? null,
    ]
  );
}
