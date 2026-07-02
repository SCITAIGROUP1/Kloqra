import { ROUTES, ErrorCodes } from "@kloqra/contracts";
import type { WorkspaceWithRoleDto } from "@kloqra/contracts";
import { AppModal, Button, Input, Label } from "@kloqra/ui";
import { ApiRequestError } from "@kloqra/web-shared";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { validateCreateWorkspaceForm } from "../create-workspace-validation";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspace: WorkspaceWithRoleDto) => void;
};

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated
}: CreateWorkspaceDialogProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [loading, setLoading] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateCreateWorkspaceForm(name);
    setFieldErrors(errors);
    if (errors.name) return;

    setLoading(true);
    setLimitExceeded(false);
    try {
      const created = await api<WorkspaceWithRoleDto>(ROUTES.TENANTS.WORKSPACES, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name: name.trim() })
      });
      setWorkspaces([...workspaces, created]);
      toast.success(`Workspace "${created.name}" created`);
      setName("");
      onOpenChange(false);
      onCreated?.(created);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
        setLimitExceeded(true);
        toast.error("Workspace limit reached for your plan.");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to create workspace");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create workspace"
      description="Add a new workspace to your organization."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-tenant-workspace-form" disabled={loading}>
            {loading ? "Creating…" : "Create workspace"}
          </Button>
        </>
      }
    >
      <form id="create-tenant-workspace-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
          {limitExceeded ? (
            <p className="text-xs text-muted-foreground">
              Upgrade your plan to add more workspaces.{" "}
              <Link href="/account/billing" className="font-medium text-primary underline">
                View billing
              </Link>
            </p>
          ) : null}
        </div>
      </form>
    </AppModal>
  );
}
