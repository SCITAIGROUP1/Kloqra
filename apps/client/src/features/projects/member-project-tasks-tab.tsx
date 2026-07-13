"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TaskDto } from "@kloqra/contracts";
import {
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  entityRowClassName,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { useMemo } from "react";
import { useMemberProjectDetail } from "./project-detail-context";

export function MemberProjectTasksTab() {
  const { workspaceId, projectId } = useMemberProjectDetail();
  const filters = useMemo(() => ({ projectId }), [projectId]);

  const {
    items: tasks,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    loading
  } = usePaginatedList<TaskDto>({
    workspaceId,
    basePath: ROUTES.TASKS.LIST,
    filters,
    refreshOnFocus: true,
    refreshOnStaleScopes: ["tasks"]
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of tasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  if (!loading && tasks.length === 0) {
    return (
      <EmptyState
        title="No assigned tasks"
        description="Ask your admin to assign you to tasks on this project before you can log time here."
      />
    );
  }

  return (
    <DataTableCard>
      {loading ? (
        <TableLoadingState rows={6} columns={3} />
      ) : (
        <>
          <div className="divide-y divide-border/60">
            {grouped.map(([categoryName, categoryTasks]) => (
              <div key={categoryName}>
                <h3 className="border-b border-border/70 bg-muted/20 px-5 py-3 text-sm font-semibold text-muted-foreground">
                  {categoryName}
                </h3>
                <Table>
                  <TableHeader>
                    <DataTableHeaderRow>
                      <DataTableHead>Task</DataTableHead>
                      <DataTableHead>Billable</DataTableHead>
                      <DataTableHead>Assignees</DataTableHead>
                    </DataTableHeaderRow>
                  </TableHeader>
                  <TableBody>
                    {categoryTasks.map((t) => (
                      <TableRow key={t.id} className={entityRowClassName(t.isActive)}>
                        <DataTableCell className="font-medium">{t.taskName}</DataTableCell>
                        <DataTableCell>
                          <Badge variant={t.billableDefault ? "default" : "secondary"}>
                            {t.billableDefault ? "Billable" : "Non-billable"}
                          </Badge>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-wrap gap-1">
                            {t.assignees.map((a) => (
                              <Badge key={a.userId} variant="outline" className="text-[10px]">
                                {a.userName}
                              </Badge>
                            ))}
                          </div>
                        </DataTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            disabled={loading}
          />
        </>
      )}
    </DataTableCard>
  );
}
