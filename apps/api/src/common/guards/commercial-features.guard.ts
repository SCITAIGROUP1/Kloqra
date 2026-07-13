import { type CanActivate, Injectable } from "@nestjs/common";
import { assertClientCommercialFeaturesEnabled } from "../commercial/assert-commercial-features";

@Injectable()
export class CommercialFeaturesGuard implements CanActivate {
  canActivate(): boolean {
    assertClientCommercialFeaturesEnabled();
    return true;
  }
}
