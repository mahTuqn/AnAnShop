import { describe, expect, it } from "vitest";
import { validateRoleAssignment, type RoleAssignmentPolicyInput } from "@/modules/admin/rbac";

const base: RoleAssignmentPolicyInput = { actorId: "actor", targetUserId: "staff", roleCode: "STAFF", action: "ASSIGN", roleExists: true, alreadyAssigned: false, activeAdminCount: 2, targetIsActiveAdmin: false };

describe("staff role policy", () => {
  it("cho phép assign hợp lệ và chặn assign trùng", () => {
    expect(validateRoleAssignment(base).ok).toBe(true);
    const duplicate = validateRoleAssignment({ ...base, alreadyAssigned: true });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("CONFLICT");
  });

  it("không cho tự gỡ ADMIN hoặc gỡ ADMIN cuối cùng", () => {
    expect(validateRoleAssignment({ ...base, actorId: "admin", targetUserId: "admin", roleCode: "ADMIN", action: "REVOKE", alreadyAssigned: true, targetIsActiveAdmin: true }).ok).toBe(false);
    expect(validateRoleAssignment({ ...base, roleCode: "ADMIN", action: "REVOKE", alreadyAssigned: true, activeAdminCount: 1, targetIsActiveAdmin: true }).ok).toBe(false);
  });
});

