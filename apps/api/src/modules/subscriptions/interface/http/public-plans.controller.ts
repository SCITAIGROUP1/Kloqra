import { ROUTES } from "@kloqra/contracts";
import { Controller, Get } from "@nestjs/common";
import { PublicPlansService } from "../../application/public-plans.service";

@Controller()
export class PublicPlansController {
  constructor(private plans: PublicPlansService) {}

  @Get(ROUTES.PLANS.PUBLIC)
  listPublic() {
    return this.plans.listPublicPlans();
  }

  @Get(ROUTES.PLANS.PRICING)
  listPricing() {
    return this.plans.listPricingPlans();
  }
}
