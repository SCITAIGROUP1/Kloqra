import type { AuthSessionDto, StartupPagePreference } from "@kloqra/contracts";
import { fetchUserProfile } from "../stores/user-profile.store";
import { resolveStartupPath } from "../utils/startup-page";
import { hasMultipleWorkspaces } from "./workspace-check";

/** Resolve where to send a member immediately after authentication. */
export async function resolveClientPostAuthPath(
  session: AuthSessionDto,
  next?: string | null
): Promise<string> {
  const safeNext = next && next.startsWith("/") ? next : null;

  try {
    const multi = await hasMultipleWorkspaces(session.workspaceId);
    if (multi) {
      return `/select-workspace${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;
    }

    const profile = await fetchUserProfile(session.workspaceId);
    const startup = resolveStartupPath(
      profile?.preferences.startupPage as StartupPagePreference | undefined
    );
    return safeNext ?? startup;
  } catch {
    return safeNext ?? "/dashboard";
  }
}
