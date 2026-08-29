import { AppError, Result, err, ok } from "../shared";

export interface RoleAssignmentPolicyInput {
  actorId: string;
  targetUserId: string;
  roleCode: string;
  action: "ASSIGN" | "REVOKE";
  roleExists: boolean;
  alreadyAssigned: boolean;
  activeAdminCount: number;
  targetIsActiveAdmin: boolean;
}

export function validateRoleAssignment(input: RoleAssignmentPolicyInput): Result<void> {
  if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(input.roleCode)) return err(new AppError("VALIDATION_ERROR", "Mã vai trò không hợp lệ", 400));
  if (!input.roleExists) return err(new AppError("NOT_FOUND", "Vai trò không tồn tại", 404));
  if (input.action === "ASSIGN" && input.alreadyAssigned) return err(new AppError("CONFLICT", "Nhân viên đã có vai trò này", 409));
  if (input.action === "REVOKE" && !input.alreadyAssigned) return err(new AppError("CONFLICT", "Nhân viên không có vai trò này", 409));
  if (input.action === "REVOKE" && input.actorId === input.targetUserId && input.roleCode === "ADMIN") return err(new AppError("CONFLICT", "Không thể tự thu hồi quyền ADMIN", 409));
  if (input.action === "REVOKE" && input.roleCode === "ADMIN" && input.targetIsActiveAdmin && input.activeAdminCount <= 1) return err(new AppError("CONFLICT", "Hệ thống phải còn ít nhất một ADMIN", 409));
  return ok(undefined);
}

