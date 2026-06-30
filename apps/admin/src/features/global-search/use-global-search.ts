"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_ENTITY_RESULTS,
  fetchGlobalSearchEntities,
  type GlobalSearchEntityResults
} from "./global-search-api";
import { GLOBAL_SEARCH_DEBOUNCE_MS, GLOBAL_SEARCH_MIN_QUERY_LENGTH } from "./global-search-nav";

export function useGlobalSearch(workspaceId: string, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [entityResults, setEntityResults] =
    useState<GlobalSearchEntityResults>(EMPTY_ENTITY_RESULTS);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), GLOBAL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!workspaceId || trimmed.length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setEntityResults(EMPTY_ENTITY_RESULTS);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    void fetchGlobalSearchEntities(workspaceId, trimmed)
      .then((results) => {
        if (requestId !== requestIdRef.current) return;
        setEntityResults(results);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [workspaceId, debouncedQuery]);

  const shouldSearchEntities = debouncedQuery.trim().length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;

  return {
    debouncedQuery,
    loading: loading && shouldSearchEntities,
    entityResults,
    shouldSearchEntities
  };
}
