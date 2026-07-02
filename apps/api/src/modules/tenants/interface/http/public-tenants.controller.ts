import { ROUTES, type PublicTenantDto } from "@kloqra/contracts";
import { Controller, Get, Param } from "@nestjs/common";
import { TenantsService } from "../../application/tenants.service";

@Controller()
export class PublicTenantsController {
  constructor(private tenants: TenantsService) {}

  @Get(ROUTES.TENANTS.PUBLIC(":slug"))
  getBySlug(@Param("slug") slug: string): Promise<PublicTenantDto> {
    return this.tenants.getPublicBySlug(slug);
  }
}
