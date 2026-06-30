import { ErrorCodes, reportingApiKeyHeaders } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { API_CREDENTIAL_KEY } from "../../../common/decorators/api-credential.decorator";
import { DomainException } from "../../../common/errors/domain.exception";
import { ReportingApiCredentialService } from "../application/reporting-api-credential.service";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private credentials: ReportingApiCredentialService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey = this.headerValue(req.headers[reportingApiKeyHeaders.API_KEY]);
    const secret = this.headerValue(req.headers[reportingApiKeyHeaders.API_SECRET]);

    if (!apiKey || !secret) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: `Missing ${reportingApiKeyHeaders.API_KEY} or ${reportingApiKeyHeaders.API_SECRET} header`
      });
    }

    try {
      req[API_CREDENTIAL_KEY] = await this.credentials.validate(apiKey, secret);
      return true;
    } catch (err: unknown) {
      if (err instanceof DomainException) throw err;
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid API credentials"
      });
    }
  }

  private headerValue(value: string | string[] | undefined): string | null {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
    return null;
  }
}
