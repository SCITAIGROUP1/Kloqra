"use client";

import type { TeamMemberOverviewDto } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { UserCog } from "lucide-react";
import { useEffect, useState } from "react";

export function TeamMemberEditDialog({
  member,
  saving,
  onClose,
  onSave
}: {
  member: TeamMemberOverviewDto | null;
  saving: boolean;
  onClose: () => void;
  onSave: (role: "ADMIN" | "MEMBER") => void;
}) {
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  return (
    <AppModal
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Edit member"
      description={member ? `Update role for ${member.userName}` : "Update member role"}
      icon={<UserCog className="size-5" />}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!member || saving || member?.role === role}
            onClick={() => member && onSave(role)}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      {member ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium">{member.userName}</p>
            <p className="text-xs text-muted-foreground">{member.userEmail}</p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </AppModal>
  );
}
