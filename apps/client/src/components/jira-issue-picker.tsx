"use client";

import type { JiraIssueDto } from "@kloqra/contracts";

interface JiraIssuePickerProps {
  issues: JiraIssueDto[];
  onSelect: (value: string) => void;
}

export function JiraIssuePicker({ issues, onSelect }: JiraIssuePickerProps) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Jira — In Progress ({issues.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {issues.map((issue) => (
          <button
            key={issue.key}
            type="button"
            onClick={() => onSelect(`${issue.key}: ${issue.summary}`)}
            title={`${issue.key}: ${issue.summary}`}
            className="inline-flex max-w-[280px] items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-left text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <span className="shrink-0 font-mono font-semibold text-primary/80">{issue.key}</span>
            <span className="truncate text-muted-foreground">{issue.summary}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
