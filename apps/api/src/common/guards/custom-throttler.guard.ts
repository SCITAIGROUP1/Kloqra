import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerRequest } from "@nestjs/throttler";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;

    // The "auth" throttler is strict and should only apply to endpoints explicitly decorated with @Throttle({ auth: ... })
    if (throttler.name === "auth") {
      const handler = context.getHandler();
      const classRef = context.getClass();
      const hasLimitOverride = this.reflector.getAllAndOverride(
        `THROTTLER:LIMIT${throttler.name}`,
        [handler, classRef]
      );
      const hasTtlOverride = this.reflector.getAllAndOverride(`THROTTLER:TTL${throttler.name}`, [
        handler,
        classRef
      ]);

      if (hasLimitOverride === undefined && hasTtlOverride === undefined) {
        return true; // skip this throttler if no override is set
      }
    }

    return super.handleRequest(requestProps);
  }
}
