export type OrderLookupWhere = { id: string } | { code: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds a parameterized Prisma unique selector without ever casting an order code to UUID. */
export function orderLookupWhere(value: string): OrderLookupWhere {
  return UUID_PATTERN.test(value) ? { id: value } : { code: value };
}
