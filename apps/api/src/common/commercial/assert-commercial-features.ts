import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import { isClientCommercialFeaturesEnabled } from "./client-commercial-features.util";

export function assertClientCommercialFeaturesEnabled(): void {
  if (isClientCommercialFeaturesEnabled()) return;
  throw new DomainException(
    ErrorCodes.COMMERCIAL_FEATURES_DISABLED,
    "Client commercial features (rates, revenue, budgets, invoices) are disabled.",
    HttpStatus.FORBIDDEN
  );
}
