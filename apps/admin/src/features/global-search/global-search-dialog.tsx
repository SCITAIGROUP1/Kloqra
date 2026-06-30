"use client";

import { Dialog, DialogBody, DialogContent, DialogTitle, cn } from "@kloqra/ui";
import { Command } from "cmdk";
import {
  Activity,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Search,
  Tags,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GlobalSearchEntityGroup, GlobalSearchEntityResults } from "./global-search-api";
import {
  filterAdminNavItems,
  toPageSearchResult,
  type GlobalSearchResult,
  type GlobalSearchViewAll
} from "./global-search-nav";
import { useGlobalSearch } from "./use-global-search";

type GlobalSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
};

const GROUP_META = {
  pages: { heading: "Pages", icon: LayoutDashboard },
  projects: { heading: "Projects", icon: FolderKanban },
  tasks: { heading: "Tasks", icon: ListTodo },
  categories: { heading: "Categories", icon: Tags },
  people: { heading: "People", icon: Users }
} as const;

export function GlobalSearchDialog({ open, onOpenChange, workspaceId }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { loading, entityResults, shouldSearchEntities } = useGlobalSearch(workspaceId, query);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const pageResults = useMemo(() => filterAdminNavItems(query).map(toPageSearchResult), [query]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const hasEntityResults = shouldSearchEntities && hasAnyEntityHits(entityResults);
  const showEmptyEntities =
    shouldSearchEntities && !loading && !hasEntityResults && query.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" showClose={false} className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <DialogBody className="p-0">
          <Command
            shouldFilter={false}
            loop
            className="flex max-h-[min(70vh,32rem)] flex-col overflow-hidden bg-popover"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search pages, projects, tasks, people…"
                aria-label="Search admin"
                className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading ? (
                <Loader2
                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </div>
            <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
              {pageResults.length > 0 ? (
                <ResultGroup
                  heading={GROUP_META.pages.heading}
                  icon={GROUP_META.pages.icon}
                  results={pageResults}
                  onSelect={handleSelect}
                />
              ) : null}

              {shouldSearchEntities ? (
                <>
                  <EntityGroupSection
                    heading={GROUP_META.projects.heading}
                    icon={GROUP_META.projects.icon}
                    group={entityResults.projects}
                    onSelect={handleSelect}
                  />
                  <EntityGroupSection
                    heading={GROUP_META.tasks.heading}
                    icon={GROUP_META.tasks.icon}
                    group={entityResults.tasks}
                    onSelect={handleSelect}
                  />
                  <EntityGroupSection
                    heading={GROUP_META.categories.heading}
                    icon={GROUP_META.categories.icon}
                    group={entityResults.categories}
                    onSelect={handleSelect}
                  />
                  <EntityGroupSection
                    heading={GROUP_META.people.heading}
                    icon={GROUP_META.people.icon}
                    group={entityResults.people}
                    onSelect={handleSelect}
                  />
                </>
              ) : null}

              {showEmptyEntities ? (
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No matching projects, tasks, categories, or people.
                </Command.Empty>
              ) : null}

              {!query.trim() && pageResults.length === 0 ? (
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Start typing to search the workspace.
                </Command.Empty>
              ) : null}
            </Command.List>
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                navigate
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                open
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                close
              </span>
            </div>
          </Command>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({
  heading,
  icon: Icon,
  results,
  viewAll,
  onSelect
}: {
  heading: string;
  icon: typeof LayoutDashboard;
  results: GlobalSearchResult[];
  viewAll?: GlobalSearchViewAll;
  onSelect: (href: string) => void;
}) {
  if (results.length === 0) return null;

  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {results.map((result) => (
        <Command.Item
          key={result.id}
          value={result.id}
          onSelect={() => onSelect(result.href)}
          className={commandItemClass}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{result.label}</span>
            {result.subtitle ? (
              <span className="block truncate text-xs text-muted-foreground">
                {result.subtitle}
              </span>
            ) : null}
          </span>
        </Command.Item>
      ))}
      {viewAll ? (
        <Command.Item
          key={`view-all:${viewAll.type}`}
          value={`view-all:${viewAll.type}`}
          onSelect={() => onSelect(viewAll.href)}
          className={cn(commandItemClass, "text-primary")}
        >
          <Activity className="size-4 shrink-0" aria-hidden />
          <span>{viewAll.label}</span>
        </Command.Item>
      ) : null}
    </Command.Group>
  );
}

function EntityGroupSection({
  heading,
  icon,
  group,
  onSelect
}: {
  heading: string;
  icon: typeof LayoutDashboard;
  group: GlobalSearchEntityGroup;
  onSelect: (href: string) => void;
}) {
  if (group.error) return null;

  return (
    <ResultGroup
      heading={heading}
      icon={icon}
      results={group.results}
      viewAll={group.viewAll}
      onSelect={onSelect}
    />
  );
}

function hasAnyEntityHits(results: GlobalSearchEntityResults) {
  return (
    results.projects.results.length > 0 ||
    results.tasks.results.length > 0 ||
    results.categories.results.length > 0 ||
    results.people.results.length > 0
  );
}

const commandItemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground";
