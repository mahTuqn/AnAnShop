# P0 backend hardening integration

The agent sandbox cannot update existing files. Apply these replacements:

1. In `src/app/api/admin/audit/route.ts`, replace permission
   `reports.read` with `audit.read`. Deploy migration `0004_audit_permission.sql`
   first so ADMIN retains access.
2. Deprecate the unrestricted mutation handlers:
   - `PATCH /api/admin/orders/:id`
   - `PATCH /api/admin/returns/:id`
   Route clients to their atomic, state-machine-backed replacements:
   - `PATCH /api/admin/orders/:id/transition`
   - `PATCH /api/admin/returns/:id/transition`
   The old handlers must not remain externally writable because they duplicate
   transition rules and do not write audit in the same transaction.
3. Prefer explicit RBAC mutations over whole-set replacement:
   - `POST /api/admin/staff/:id/roles/:roleCode` assigns one role.
   - `DELETE /api/admin/staff/:id/roles/:roleCode` revokes one role.
   Remove or restrict `PATCH /api/admin/staff/:id/roles`; explicit operations
   validate duplicate assignment, self-revoke and last-active-ADMIN safety.
4. New critical mutations use `adminAtomicMutationRoute`, which commits the
   business write and `audit_logs` insert in the same Serializable transaction.
   Existing product, inventory, promotion, refund and settings mutations still
   use `adminRoute`; migrate them to the atomic helper incrementally.

