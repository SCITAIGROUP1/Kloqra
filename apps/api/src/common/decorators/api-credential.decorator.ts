import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface ApiCredentialContext {
  credentialId: string;
  workspaceId: string;
  projectIds: string[];
  name: string;
}

export const API_CREDENTIAL_KEY = "apiCredential";

export const ApiCredential = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiCredentialContext => {
    const req = ctx.switchToHttp().getRequest();
    return req[API_CREDENTIAL_KEY] as ApiCredentialContext;
  }
);
