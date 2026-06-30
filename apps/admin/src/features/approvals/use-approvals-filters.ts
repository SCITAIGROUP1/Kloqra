"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import { appendApprovalsFilterSearch, parseApprovalsFilterSearch } from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useApprovalsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const filters = useMemo(() => parseApprovalsFilterSearch(search), [search]);

  const setFilters = useCallback(
    (next: TimesheetApprovalsFilterQuery) => {
      const params = new URLSearchParams(searchParams.toString());
      appendApprovalsFilterSearch(params, next);
      const q = params.toString();
      router.replace(q ? `/approvals?${q}` : "/approvals");
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  return { filters, setFilters, clearFilters };
}
