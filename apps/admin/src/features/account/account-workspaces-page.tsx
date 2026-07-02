"use client";

import {
  AppBar,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableRow
} from "@kloqra/ui";
import { canManageOrganization } from "@kloqra/web-shared";
import { Plus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CreateWorkspaceDialog } from "./components/create-workspace-dialog";
import { WorkspaceAdminAssignDialog } from "./components/workspace-admin-assign-dialog";
import { useWorkspaceAdminsOverview } from "./workspace-admins/use-workspace-admins-overview";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AccountWorkspacesPage() {
  const session = useSessionStore((s) => s.session);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const canManage = canManageOrganization(session);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);

  const { admins, setLimit } = useWorkspaceAdminsOverview();

  // Load a large enough limit to get all admins across workspaces
  useEffect(() => {
    setLimit(1000);
  }, [setLimit]);

  const adminsByWorkspace = useMemo(() => {
    const map = new Map<string, Array<{ name: string; email: string }>>();
    for (const admin of admins) {
      if (!map.has(admin.workspaceId)) {
        map.set(admin.workspaceId, []);
      }
      map.get(admin.workspaceId)!.push({ name: admin.userName, email: admin.userEmail });
    }
    return map;
  }, [admins]);

  return (
    <div className="space-y-6">
      <AppBar
        title="Workspaces"
        description="Create workspaces and assign admins per workspace."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create workspace
            </Button>
          ) : undefined
        }
      />
      <DataTableCard>
        <Table>
          <TableBody>
            <DataTableHeaderRow>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Workspace admins</DataTableHead>
              <DataTableHead>Your role</DataTableHead>
              {canManage ? <DataTableHead className="text-right">Actions</DataTableHead> : null}
            </DataTableHeaderRow>
            {workspaces.map((workspace) => {
              const workspaceAdmins = adminsByWorkspace.get(workspace.id) ?? [];

              return (
                <TableRow key={workspace.id}>
                  <DataTableCell className="font-medium">{workspace.name}</DataTableCell>
                  <DataTableCell>
                    {workspaceAdmins.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {workspaceAdmins.map((admin, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-sm font-medium leading-none">{admin.name}</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              {admin.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                  <DataTableCell>{workspace.role}</DataTableCell>
                  {canManage ? (
                    <DataTableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignTarget({ id: workspace.id, name: workspace.name })}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign admin
                      </Button>
                    </DataTableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      {assignTarget ? (
        <WorkspaceAdminAssignDialog
          workspaceId={assignTarget.id}
          workspaceName={assignTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
