# Runtime integration map

Replace this exact import in the following files:

```diff
- import { runtime } from "@/lib/server/runtime";
+ import { runtime } from "@/lib/server/runtime-selected";
```

- `src/lib/server/http.ts`
- `src/app/api/products/route.ts`
- `src/app/api/products/[slug]/route.ts`
- `src/app/api/cart/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`

No call-site changes are required. `runtime-selected.ts` preserves the synchronous
runtime shape after module initialization, lazily imports PostgreSQL persistence
only when `DATABASE_URL` is present, and otherwise exports the in-memory runtime.

