"use client";

import { useEffect } from "react";
import { registerApprovalsRefreshHandler } from "@/lib/approvals-refresh-registry";

/** Registers refresh callbacks from approval list hooks. */
export function useRegisterApprovalsRefresh(refresh: () => void): void {
  useEffect(() => registerApprovalsRefreshHandler(refresh), [refresh]);
}
