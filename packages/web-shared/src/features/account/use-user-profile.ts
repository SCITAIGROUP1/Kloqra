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
import { useSessionGeneration } from "../../hooks/use-session-generation";
import { useSessionStore } from "../../stores/session.store";
import { useUserProfileStore } from "../../stores/user-profile.store";
import { profileApiOptions, useProfileCacheKey } from "./profile-cache-key";

export function useUserProfile() {
  const cacheKey = useProfileCacheKey();
  const setSession = useSessionStore((s) => s.setSession);
  const session = useSessionStore((s) => s.session);
  const accessToken = useSessionStore((s) => s.accessToken);

  const sessionUserId = session?.user?.id;
  const cacheEntry = useUserProfileStore((s) => (cacheKey ? s.byWorkspace[cacheKey] : undefined));
  const profile =
    cacheEntry?.profile && sessionUserId && cacheEntry.userId === sessionUserId
      ? cacheEntry.profile
      : null;
  const loading =
    cacheKey && sessionUserId && cacheEntry && cacheEntry.userId !== sessionUserId
      ? true
      : cacheKey
        ? (cacheEntry?.loading ?? false)
        : false;
  const subscribe = useUserProfileStore((s) => s.subscribe);
  const refresh = useUserProfileStore((s) => s.refresh);
  const setProfile = useUserProfileStore((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);
  const sessionGeneration = useSessionGeneration();

  useEffect(() => {
    if (!cacheKey) return;
    return subscribe(cacheKey);
  }, [cacheKey, subscribe, sessionGeneration]);

  const reload = useCallback(async () => {
    if (!cacheKey) return;
    setError(null);
    try {
      await refresh(cacheKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load your profile. Please try again.");
    }
  }, [cacheKey, refresh]);

  const apiOpts = profileApiOptions(cacheKey);

  const updateProfile = useCallback(
    async (dto: UpdateUserProfileDto) => {
      if (!cacheKey) throw new Error("No active account context");
      const updated = await api<UserProfileDto>(ROUTES.USERS.ME, {
        method: "PATCH",
        ...apiOpts,
        body: JSON.stringify(dto)
      });
      setProfile(cacheKey, updated);
      if (session && accessToken && updated.name) {
        setSession({ ...session, user: { ...session.user, name: updated.name } }, accessToken);
      }
      return updated;
    },
    [cacheKey, apiOpts, session, accessToken, setSession, setProfile]
  );

  const updateName = useCallback(async (name: string) => updateProfile({ name }), [updateProfile]);

  const updatePreferences = useCallback(
    async (preferences: Record<string, unknown>) => {
      if (!cacheKey) throw new Error("No active account context");
      const updated = await api<UserProfileDto>(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        ...apiOpts,
        body: JSON.stringify(preferences)
      });
      setProfile(cacheKey, updated);
      return updated;
    },
    [cacheKey, apiOpts, setProfile]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!cacheKey) throw new Error("No active account context");
      await api(ROUTES.USERS.PASSWORD, {
        method: "POST",
        ...apiOpts,
        body: JSON.stringify({ currentPassword, newPassword })
      });
      await logoutSession(session?.workspaceId);
    },
    [cacheKey, apiOpts, session?.workspaceId]
  );

  const listSessions = useCallback(async () => {
    if (!cacheKey) throw new Error("No active account context");
    return api<UserSessionDto[]>(ROUTES.USERS.SESSIONS, apiOpts);
  }, [cacheKey, apiOpts]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      if (!cacheKey) throw new Error("No active account context");
      await api(ROUTES.USERS.SESSION(sessionId), {
        method: "DELETE",
        ...apiOpts
      });
    },
    [cacheKey, apiOpts]
  );

  const revokeOtherSessions = useCallback(async () => {
    if (!cacheKey) throw new Error("No active account context");
    return api<{ revoked: number }>(ROUTES.USERS.REVOKE_OTHER_SESSIONS, {
      method: "POST",
      ...apiOpts,
      body: JSON.stringify({})
    });
  }, [cacheKey, apiOpts]);

  const enable2fa = useCallback(async () => {
    if (!cacheKey) throw new Error("No active account context");
    return api<{ secret: string; otpauthUrl: string }>(ROUTES.USERS.TWO_FA_ENABLE, {
      method: "POST",
      ...apiOpts
    });
  }, [cacheKey, apiOpts]);

  const verify2fa = useCallback(
    async (dto: TwoFactorVerifyDto) => {
      if (!cacheKey) throw new Error("No active account context");
      await api(ROUTES.USERS.TWO_FA_VERIFY, {
        method: "POST",
        ...apiOpts,
        body: JSON.stringify(dto)
      });
      await reload();
    },
    [cacheKey, apiOpts, reload]
  );

  const disable2fa = useCallback(
    async (dto: TwoFactorDisableDto) => {
      if (!cacheKey) throw new Error("No active account context");
      await api(ROUTES.USERS.TWO_FA_DISABLE, {
        method: "POST",
        ...apiOpts,
        body: JSON.stringify(dto)
      });
      await reload();
    },
    [cacheKey, apiOpts, reload]
  );

  return {
    profile,
    loading,
    error,
    reload,
    updateProfile,
    updateName,
    updatePreferences,
    setProfile: (next: UserProfileDto) => {
      if (!cacheKey) return;
      setProfile(cacheKey, next);
    },
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
