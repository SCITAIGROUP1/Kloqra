"use client";

import {
  resolveEffectiveDateFormat,
  resolveEffectiveTimeFormat,
  resolveEffectiveTimezone,
  type DateFormatPreference,
  type TimeFormatPreference,
  type UserPreferences
} from "@kloqra/contracts";
import { useUserProfile } from "../features/account/use-user-profile";

export type DisplayPreferences = {
  timezone: string;
  weekStart: "monday" | "sunday";
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  startupPage: UserPreferences["startupPage"];
};

export function useDisplayPreferences(): DisplayPreferences {
  const { profile } = useUserProfile();
  const preferences = profile?.preferences ?? {};

  return {
    timezone: profile?.effectiveTimezone ?? resolveEffectiveTimezone(preferences),
    weekStart: preferences.weekStart ?? "monday",
    dateFormat: profile?.effectiveDateFormat ?? resolveEffectiveDateFormat(preferences),
    timeFormat: profile?.effectiveTimeFormat ?? resolveEffectiveTimeFormat(preferences),
    startupPage: preferences.startupPage
  };
}
