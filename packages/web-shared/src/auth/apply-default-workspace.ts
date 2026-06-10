import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, AuthSessionWithTokenDto, UserProfileDto } from "@kloqra/contracts";
import { api } from "../api/client";

/**
 * Switches to the user's preferred default workspace when it differs from the active one.
 * No-op when unset, invalid, or already active.
 */
export async function applyDefaultWorkspaceIfNeeded(
  session: AuthSessionDto,
  accessToken: string
): Promise<{ session: AuthSessionDto; accessToken: string }> {
  try {
    const profile = await api<UserProfileDto>(ROUTES.USERS.ME, {
      workspaceId: session.workspaceId
    });
    const defaultWorkspaceId = profile.preferences.defaultWorkspaceId;
    if (!defaultWorkspaceId || defaultWorkspaceId === session.workspaceId) {
      return { session, accessToken };
    }

    const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
      method: "POST",
      workspaceId: session.workspaceId,
      body: JSON.stringify({ workspaceId: defaultWorkspaceId })
    });
    return { session: res, accessToken: res.accessToken };
  } catch {
    return { session, accessToken };
  }
}
