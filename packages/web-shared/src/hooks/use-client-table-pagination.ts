"use client";

import { DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import { useEffect, useMemo, useState } from "react";

export function useClientTablePagination<T>(items: T[], pageSize = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  useEffect(() => {
    setPage(1);
  }, [items]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageItems,
    total,
    totalPages,
    limit: pageSize
  };
}
