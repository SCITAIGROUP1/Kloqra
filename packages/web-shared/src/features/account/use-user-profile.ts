"use client";

import {
  ROUTES,
  type TwoFactorDisableDto,
  type TwoFactorVerifyDto,
  type UpdateUserProfileDto,
  type UserProfileDto,
  type UserSessionDto
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { logoutSession } from "../../auth/logout";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";
import { useUserProfileStore } from "../../stores/user-profile.store";

export function useUserProfile() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const setSession = useSessionStore((s) => s.setSession);
  const session = useSessionStore((s) => s.session);
  const accessToken = useSessionStore((s) => s.accessToken);

  const profile = useUserProfileStore((s) => (ws ? (s.byWorkspace[ws]?.profile ?? null) : null));
  const loading = useUserProfileStore((s) => (ws ? (s.byWorkspace[ws]?.loading ?? false) : false));
  const subscribe = useUserProfileStore((s) => s.subscribe);
  const refresh = useUserProfileStore((s) => s.refresh);
  const setProfile = useUserProfileStore((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    return subscribe(ws);
  }, [ws, subscribe]);

  const reload = useCallback(async () => {
    if (!ws) return;
    setError(null);
    try {
      await refresh(ws);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    }
  }, [ws, refresh]);

  const updateProfile = useCallback(
    async (dto: UpdateUserProfileDto) => {
      if (!ws) throw new Error("No workspace");
      const updated = await api<UserProfileDto>(ROUTES.USERS.ME, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify(dto)
      });
      setProfile(ws, updated);
      if (session && accessToken && updated.name) {
        setSession({ ...session, user: { ...session.user, name: updated.name } }, accessToken);
      }
      return updated;
    },
    [ws, session, accessToken, setSession, setProfile]
  );

  const updateName = useCallback(async (name: string) => updateProfile({ name }), [updateProfile]);

  const updatePreferences = useCallback(
    async (preferences: Record<string, unknown>) => {
      if (!ws) throw new Error("No workspace");
      const updated = await api<UserProfileDto>(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify(preferences)
      });
      setProfile(ws, updated);
      return updated;
    },
    [ws, setProfile]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.PASSWORD, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ currentPassword, newPassword })
      });
      await logoutSession(ws);
    },
    [ws]
  );

  const listSessions = useCallback(async () => {
    if (!ws) throw new Error("No workspace");
    return api<UserSessionDto[]>(ROUTES.USERS.SESSIONS, { workspaceId: ws });
  }, [ws]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.SESSION(sessionId), {
        method: "DELETE",
        workspaceId: ws
      });
    },
    [ws]
  );

  const revokeOtherSessions = useCallback(async () => {
    if (!ws) throw new Error("No workspace");
    return api<{ revoked: number }>(ROUTES.USERS.REVOKE_OTHER_SESSIONS, {
      method: "POST",
      workspaceId: ws,
      body: JSON.stringify({})
    });
  }, [ws]);

  const enable2fa = useCallback(async () => {
    if (!ws) throw new Error("No workspace");
    return api<{ secret: string; otpauthUrl: string }>(ROUTES.USERS.TWO_FA_ENABLE, {
      method: "POST",
      workspaceId: ws
    });
  }, [ws]);

  const verify2fa = useCallback(
    async (dto: TwoFactorVerifyDto) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.TWO_FA_VERIFY, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify(dto)
      });
      await reload();
    },
    [ws, reload]
  );

  const disable2fa = useCallback(
    async (dto: TwoFactorDisableDto) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.TWO_FA_DISABLE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify(dto)
      });
      await reload();
    },
    [ws, reload]
  );

  return {
    profile,
    loading,
    error,
    reload,
    updateProfile,
    updateName,
    updatePreferences,
    setProfile: (next: UserProfileDto) => setProfile(ws, next),
    changePassword,
    listSessions,
    revokeSession,
    revokeOtherSessions,
    enable2fa,
    verify2fa,
    disable2fa,
    workspaceRole: session?.workspaceRole,
    workspaceName: session?.workspaceName
  };
}
