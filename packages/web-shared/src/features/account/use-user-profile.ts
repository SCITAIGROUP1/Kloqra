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
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useUserProfile() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const setSession = useSessionStore((s) => s.setSession);
  const session = useSessionStore((s) => s.session);
  const accessToken = useSessionStore((s) => s.accessToken);

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws });
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateProfile = useCallback(
    async (dto: UpdateUserProfileDto) => {
      if (!ws) throw new Error("No workspace");
      const updated = await api<UserProfileDto>(ROUTES.USERS.ME, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify(dto)
      });
      setProfile(updated);
      if (session && accessToken && updated.name) {
        setSession({ ...session, user: { ...session.user, name: updated.name } }, accessToken);
      }
      return updated;
    },
    [ws, session, accessToken, setSession]
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
      setProfile(updated);
      return updated;
    },
    [ws]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.PASSWORD, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ currentPassword, newPassword })
      });
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
    changePassword,
    listSessions,
    revokeSession,
    enable2fa,
    verify2fa,
    disable2fa,
    workspaceRole: session?.workspaceRole,
    workspaceName: session?.workspaceName
  };
}
