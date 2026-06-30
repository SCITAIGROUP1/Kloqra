"use client";

import { ROUTES, type JiraIssueDto, type JiraIssuesResponseDto } from "@kloqra/contracts";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export function useJiraIssues(enabled: boolean) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [issues, setIssues] = useState<JiraIssueDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !ws) return;
    setLoading(true);
    api<JiraIssuesResponseDto>(ROUTES.JIRA.MY_ISSUES, { workspaceId: ws })
      .then((res) => setIssues(res.connected ? res.issues : []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [enabled, ws]);

  return { issues, loading };
}
