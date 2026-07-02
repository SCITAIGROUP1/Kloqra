"use client";

import {
  ROUTES,
  type PlatformUserProfileDto,
  type TwoFactorEnableResponseDto,
  type UpdatePlatformUserProfileDto,
  type UserSessionDto
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { usePlatformSessionStore } from "../../stores/platform-session.store";
import { usePlatformUserProfileStore } from "../../stores/platform-user-profile.store";

export function usePlatformUserProfile() {
  const setSession = usePlatformSessionStore((s) => s.setSession);
  const session = usePlatformSessionStore((s) => s.session);
  const accessToken = usePlatformSessionStore((s) => s.accessToken);

  const profile = usePlatformUserProfileStore((s) => s.profile.profile);
  const loading = usePlatformUserProfileStore((s) => s.profile.loading);
  const subscribe = usePlatformUserProfileStore((s) => s.subscribe);
  const refresh = usePlatformUserProfileStore((s) => s.refresh);
  const setProfile = usePlatformUserProfileStore((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribe(), [subscribe]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    }
  }, [refresh]);

  const updateProfile = useCallback(
    async (dto: UpdatePlatformUserProfileDto) => {
      const updated = await api<PlatformUserProfileDto>(ROUTES.PLATFORM.ME, {
        method: "PATCH",
        body: JSON.stringify(dto)
      });
      if (updated) {
        setProfile(updated);
        if (session && accessToken && updated.name) {
          setSession({ ...session, user: { ...session.user, name: updated.name } }, accessToken);
        }
      }
      return updated;
    },
    [session, accessToken, setSession, setProfile]
  );

  const updateName = useCallback(async (name: string) => updateProfile({ name }), [updateProfile]);

  const updatePreferences = useCallback(
    async (preferences: Record<string, unknown>) => {
      const updated = await api<PlatformUserProfileDto>(ROUTES.PLATFORM.ME_PREFERENCES, {
        method: "PATCH",
        body: JSON.stringify(preferences)
      });
      setProfile(updated);
      return updated;
    },
    [setProfile]
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api(ROUTES.PLATFORM.ME_PASSWORD, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }, []);

  const listSessions = useCallback(() => api<UserSessionDto[]>(ROUTES.PLATFORM.ME_SESSIONS), []);

  const revokeSession = useCallback(async (sessionId: string) => {
    await api(ROUTES.PLATFORM.ME_SESSION(sessionId), { method: "DELETE" });
  }, []);

  const revokeOtherSessions = useCallback(
    () =>
      api<{ revoked: number }>(ROUTES.PLATFORM.ME_SESSIONS_REVOKE_OTHERS, {
        method: "POST",
        body: JSON.stringify({})
      }),
    []
  );

  const enable2fa = useCallback(
    () =>
      api<TwoFactorEnableResponseDto>(ROUTES.PLATFORM.ME_2FA_ENABLE, {
        method: "POST",
        body: JSON.stringify({})
      }),
    []
  );

  const verify2fa = useCallback(
    async (code: string) => {
      await api(ROUTES.PLATFORM.ME_2FA_VERIFY, {
        method: "POST",
        body: JSON.stringify({ code })
      });
      await refresh();
    },
    [refresh]
  );

  const disable2fa = useCallback(
    async (currentPassword: string, code: string) => {
      await api(ROUTES.PLATFORM.ME_2FA_DISABLE, {
        method: "POST",
        body: JSON.stringify({ currentPassword, code })
      });
      await refresh();
    },
    [refresh]
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
    revokeOtherSessions,
    enable2fa,
    verify2fa,
    disable2fa
  };
}
