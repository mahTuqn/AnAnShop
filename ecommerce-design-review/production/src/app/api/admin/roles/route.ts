import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { AppError, object, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "staff.read", async ({ db }) => {
  const roles = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT r.id,r.code,r.name,r.is_system,
    COALESCE(jsonb_agg(jsonb_build_object('code',p.code,'name',p.name)) FILTER (WHERE p.id IS NOT NULL),'[]') AS permissions,
    (SELECT COUNT(*)::int FROM user_roles ur WHERE ur.role_id=r.id) AS assigned_count
    FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
    GROUP BY r.id ORDER BY r.code`);
  const permissions = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT code,name FROM permissions ORDER BY code");
  return { data: { roles, permissions } };
});

export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "staff.write", async ({ tx }) => {
  const body = object(await request.json()); const code = stringField(body,"code",{min:2,max:50})!.toUpperCase(); const name=stringField(body,"name",{min:2,max:100})!;
  if(!/^[A-Z][A-Z0-9_]{1,49}$/.test(code)||['ADMIN','STAFF','CUSTOMER'].includes(code))throw new AppError('VALIDATION_ERROR','Mã vai trò tùy chỉnh không hợp lệ',400);
  const permissionCodes=parsePermissions(body.permissionCodes); await validatePermissions(tx,permissionCodes);
  const roles=await tx.$queryRawUnsafe<Array<{id:string;code:string;name:string}>>("INSERT INTO roles(code,name,is_system) VALUES($1,$2,FALSE) RETURNING id,code,name",code,name); const role=roles[0];
  for(const permission of permissionCodes)await tx.$executeRawUnsafe("INSERT INTO role_permissions(role_id,permission_id) SELECT $1::uuid,id FROM permissions WHERE code=$2",role.id,permission);
  return {data:{...role,permissions:permissionCodes},status:201,audit:{action:'ROLE_CREATED',entityType:'ROLE',entityId:role.id,after:{code,name,permissionCodes}}};
});

export function parsePermissions(value:unknown):string[]{if(!Array.isArray(value)||value.length>100)throw new AppError('VALIDATION_ERROR','Danh sách quyền không hợp lệ',400);return [...new Set(value.map(v=>{if(typeof v!=='string'||v.length>100)throw new AppError('VALIDATION_ERROR','Mã quyền không hợp lệ',400);return v.trim()}))]}
export async function validatePermissions(tx:any,codes:string[]){if(!codes.length)return;const[{count}]=await tx.$queryRawUnsafe("SELECT COUNT(*)::bigint AS count FROM permissions WHERE code=ANY($1::text[])",codes);if(Number(count)!==codes.length)throw new AppError('VALIDATION_ERROR','Có quyền không tồn tại',400)}