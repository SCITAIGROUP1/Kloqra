"use client";

import { ROUTES } from "@kloqra/contracts";
import type { InviteMemberResponseDto, WorkspaceListItemDto } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { validateAssignWorkspaceAdminForm } from "../assign-workspace-admin-validation";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type WorkspaceAdminAssignDialogProps = {
  workspaceId?: string;
  workspaceName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
};

export function WorkspaceAdminAssignDialog({
  workspaceId: initialWorkspaceId,
  workspaceName: initialWorkspaceName,
  open,
  onOpenChange,
  onAssigned
}: WorkspaceAdminAssignDialogProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [workspaces, setWorkspaces] = useState<WorkspaceListItemDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId ?? "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; name?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWorkspaceId(initialWorkspaceId ?? "");
    setEmail("");
    setName("");
    setFieldErrors({});
  }, [open, initialWorkspaceId]);

  useEffect(() => {
    if (!open || !ws) return;
    void fetchListItems<WorkspaceListItemDto>(ROUTES.WORKSPACES.LIST, { workspaceId: ws })
      .then((items) => {
        setWorkspaces(items);
        if (!initialWorkspaceId && items[0]) {
          setWorkspaceId(items[0].id);
        }
      })
      .catch(() => setWorkspaces([]));
  }, [open, ws, initialWorkspaceId]);

  const workspaceName =
    initialWorkspaceName ??
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ??
    "workspace";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }
    const errors = validateAssignWorkspaceAdminForm(email, name);
    setFieldErrors(errors);
    if (errors.email || errors.name) return;

    setLoading(true);
    try {
      await api<InviteMemberResponseDto>(ROUTES.WORKSPACES.ASSIGN_ADMIN(workspaceId), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ email: email.trim(), name: name.trim() })
      });
      toast.success(`Workspace admin invited to ${workspaceName}`);
      setEmail("");
      setName("");
      onOpenChange(false);
      onAssigned?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign workspace admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign workspace admin"
      description={`Invite an admin for ${workspaceName}. They will only access that workspace until invited elsewhere.`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-workspace-admin-form"
            disabled={loading || !workspaceId}
          >
            {loading ? "Sending…" : "Send invite"}
          </Button>
        </>
      }
    >
      <form id="assign-workspace-admin-form" onSubmit={handleSubmit} className="space-y-4">
        {!initialWorkspaceId ? (
          <div className="space-y-2">
            <Label htmlFor="assign-workspace">Workspace</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger id="assign-workspace" aria-label="Select workspace">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-name">Name</Label>
          <Input
            id="admin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>
      </form>
    </AppModal>
  );
}
