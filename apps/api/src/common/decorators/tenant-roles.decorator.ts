import { SetMetadata } from "@nestjs/common";
import type { TenantMemberRole } from "../tenant/tenant-context";

export const TENANT_ROLES_KEY = "tenantRoles";
export const TenantRoles = (...roles: TenantMemberRole[]) => SetMetadata(TENANT_ROLES_KEY, roles);
