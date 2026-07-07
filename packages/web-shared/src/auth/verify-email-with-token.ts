import { ROUTES } from "@kloqra/contracts";
import type {
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresPasswordChangeResponseDto
} from "@kloqra/contracts";
import { api } from "../api/client";

export type VerifyEmailWithTokenResult =
  | (AuthSessionDto & { accessToken: string; refreshToken?: string })
  | LoginRequires2faResponseDto
  | LoginRequiresPasswordChangeResponseDto;

/** Exchange a verification token for a session (invite handoff continuation). */
export function verifyEmailWithToken(token: string): Promise<VerifyEmailWithTokenResult> {
  return api<VerifyEmailWithTokenResult>(ROUTES.AUTH.VERIFY_EMAIL, {
    method: "POST",
    body: JSON.stringify({ token })
  });
}
