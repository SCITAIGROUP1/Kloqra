"use client";

import { slugifyName } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CenteredLoader,
  EmptyState,
  Input,
  Label
} from "@kloqra/ui";
import { CopyableValue, useTenantCurrent, useUpdateTenantCurrent } from "@kloqra/web-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session.store";

export function AccountOrganizationPage() {
  const router = useRouter();
  const requiresWorkspaceSetup = useSessionStore((s) => s.session?.requiresWorkspaceSetup);
  const { tenant, loading, error, reload } = useTenantCurrent();
  const { updateTenantCurrent, saving, error: saveError } = useUpdateTenantCurrent();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState("");

  const pendingSetup = tenant?.status === "pending_setup";

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setSlug(tenant.slug);
    setSlugTouched(false);
  }, [tenant]);

  function onNameChange(nextName: string) {
    setName(nextName);
    if (pendingSetup && !slugTouched) {
      setSlug(slugifyName(nextName));
    }
  }

  async function completeSetup(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !slug.trim()) {
      setFormError("Enter an organization name and organization ID to continue.");
      return;
    }
    try {
      const updated = await updateTenantCurrent({ name: name.trim(), slug: slug.trim() });
      await reload();
      if (updated.status === "active") {
        router.push(requiresWorkspaceSetup ? "/account/workspaces?setup=required" : "/account");
      }
    } catch (e) {
      setFormError(
        e instanceof Error && e.message
          ? e.message
          : "We couldn't activate your organization. Review your entries and try again."
      );
    }
  }

  if (loading) return <CenteredLoader label="Loading organization profile…" />;
  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <AppBar
          title="Organization"
          description="Manage your organization profile and activation settings."
        />
        <EmptyState
          title="Unable to load organization profile"
          description={
            error ??
            "We couldn't retrieve your organization details. Check your connection and try again."
          }
          action={
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Organization"
        description={
          pendingSetup
            ? "Complete your organization profile to activate your account."
            : "Your organization profile."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pendingSetup ? "Finish setup" : tenant.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {pendingSetup ? (
            <form onSubmit={completeSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Organization ID</Label>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                  className="font-mono"
                  data-testid="org-slug-input"
                />
                <p className="text-xs text-muted-foreground">
                  Used in exports, billing records, and when contacting support.
                </p>
              </div>
              {formError || saveError ? (
                <p className="text-destructive">{formError || saveError}</p>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Activate organization"}
              </Button>
            </form>
          ) : (
            <>
              <CopyableValue label="Organization ID" value={tenant.slug} testId="copy-org-slug" />
              <p className="text-xs text-muted-foreground">
                Used in exports, billing records, and when contacting support.
              </p>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p>{tenant.status}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
