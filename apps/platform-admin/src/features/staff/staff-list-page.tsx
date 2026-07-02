"use client";

import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState,
  Badge
} from "@kloqra/ui";
import { api, usePlatformStaff } from "@kloqra/web-shared";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { StaffCreateModal } from "./staff-create-modal";

const ALL = "__all__";

const ROLE_OPTIONS = [
  { value: ALL, label: "All roles" },
  { value: "SUPERADMIN", label: "Superadmin" },
  { value: "SUPPORT", label: "Support" }
];

const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" }
];

export function StaffListPage() {
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [createOpen, setCreateOpen] = useState(false);

  const isActive = statusFilter === ALL ? undefined : statusFilter === "true";

  const {
    items: staff,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    error,
    reload
  } = usePlatformStaff({ role: roleFilter, isActive });

  const deleteStaff = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await api(`/platform/staff/${id}`, { method: "DELETE" });
      void reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete staff member.");
    }
  };

  return (
    <div className="space-y-6">
      <AppBar
        title="Staff Management"
        description="Manage platform superadmins and support agents."
        actions={<Button onClick={() => setCreateOpen(true)}>Create staff</Button>}
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or email…"
            searchAriaLabel="Search staff"
            filters={
              <>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={5} columns={5} />
        ) : staff.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {search || roleFilter !== ALL || statusFilter !== ALL
              ? "No staff match your filters."
              : "No staff found."}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Email</DataTableHead>
                  <DataTableHead>Role</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Joined</DataTableHead>
                  <DataTableHead className="w-[50px]"></DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {staff.map((user) => (
                  <TableRow key={user.id}>
                    <DataTableCell className="font-medium">{user.name}</DataTableCell>
                    <DataTableCell>{user.email}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={user.role === "SUPERADMIN" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={user.isActive ? "success" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</DataTableCell>
                    <DataTableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => deleteStaff(user.id)}
                        aria-label="Delete staff member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DataTableCell>
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
              pageUnit="staff members"
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      <StaffCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
    </div>
  );
}
