"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TeamMemberDto } from "@kloqra/contracts";
import {
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  SegmentedControl,
  Table,
  TableBody,
  TableHeader,
  TableLoadingRows,
  TablePagination,
  TableRow,
  TableToolbar
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { ShieldCheck, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useMemberProjectDetail } from "./project-detail-context";

type RoleFilter = "all" | "PROJECT_MANAGER" | "MEMBER";

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PROJECT_MANAGER", label: "Managers" },
  { value: "MEMBER", label: "Members" }
];

function RoleBadge({ role }: { role: TeamMemberDto["role"] }) {
  if (role === "PROJECT_MANAGER") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-primary/30 bg-primary/5 text-primary text-[11px] font-medium"
      >
        <ShieldCheck className="size-3" aria-hidden />
        Project Manager
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[11px] font-medium text-muted-foreground">
      <User className="size-3" aria-hidden />
      Member
    </Badge>
  );
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberProjectTeamTab() {
  const { workspaceId, projectId } = useMemberProjectDetail();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const filters = useMemo(
    () => (roleFilter !== "all" ? { role: roleFilter } : undefined),
    [roleFilter]
  );

  const {
    items: members,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    search,
    setSearch
  } = usePaginatedList<TeamMemberDto>({
    workspaceId,
    basePath: ROUTES.PROJECTS.TEAM_ROSTER(projectId),
    filters,
    refreshOnFocus: true,
    refreshOnStaleScopes: ["projects"]
  });

  const isEmpty = !loading && members.length === 0;

  return (
    <DataTableCard>
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        searchAriaLabel="Search team members"
        filters={
          <SegmentedControl value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
        }
      />

      {isEmpty ? (
        <div className="p-6">
          <EmptyState
            title={search || roleFilter !== "all" ? "No members match" : "No team members yet"}
            description={
              search || roleFilter !== "all"
                ? "Try a different search or filter."
                : "Members assigned to this project will appear here."
            }
          />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Member</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead>Role</DataTableHead>
                <DataTableHead>Status</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>

            {/* TableLoadingRows renders its own <tbody> — must be a sibling of TableHeader, not nested inside TableBody */}
            {loading ? (
              <TableLoadingRows rows={6} columns={4} />
            ) : (
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    {/* Member — avatar + name */}
                    <DataTableCell>
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                        >
                          {memberInitials(m.userName)}
                        </div>
                        <span className="font-medium">{m.userName}</span>
                      </div>
                    </DataTableCell>

                    {/* Email */}
                    <DataTableCell className="text-muted-foreground">{m.userEmail}</DataTableCell>

                    {/* Role */}
                    <DataTableCell>
                      <RoleBadge role={m.role} />
                    </DataTableCell>

                    {/* Status */}
                    <DataTableCell>
                      {m.isActive !== false ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium text-muted-foreground"
                        >
                          Inactive
                        </Badge>
                      )}
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>

          {totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}
    </DataTableCard>
  );
}
