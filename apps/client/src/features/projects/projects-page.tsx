"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectDto } from "@kloqra/contracts";
import {
  AppBar,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  ProjectNameWithColor,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import Link from "next/link";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function ProjectsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { workspaceNamesById } = useProjectsStore();
  const {
    items: projects,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    loading
  } = usePaginatedList<ProjectDto>({
    workspaceId: ws,
    basePath: ROUTES.PROJECTS.LIST
  });

  return (
    <div className="space-y-6">
      <AppBar
        title="My projects"
        description="Projects where you are on the team. Ask an admin for a team invite link to join more."
      />
      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={5} columns={4} />
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No assigned projects"
              description="You are not on any projects yet. Open an invite link from your admin to join."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Workspace</DataTableHead>
                  <DataTableHead>Project</DataTableHead>
                  <DataTableHead>Client</DataTableHead>
                  <DataTableHead>Active</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <DataTableCell>
                      {p.workspaceName ?? workspaceNamesById[p.workspaceId] ?? "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <Link
                        href={`/projects/${p.id}/overview`}
                        className="font-medium text-primary hover:underline"
                      >
                        <ProjectNameWithColor name={p.name} color={p.myColor ?? p.color} />
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{p.clientName ?? "—"}</DataTableCell>
                    <DataTableCell>{p.isActive ? "Yes" : "No"}</DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}
