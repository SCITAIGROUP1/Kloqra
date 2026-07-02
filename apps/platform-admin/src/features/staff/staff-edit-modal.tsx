"use client";

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
import { api } from "@kloqra/web-shared";
import { UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

type StaffType = {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "SUPPORT";
};

type StaffEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffType | null;
  onUpdated?: () => void;
};

const editStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPERADMIN", "SUPPORT"])
});

export function StaffEditModal({ open, onOpenChange, staff, onUpdated }: StaffEditModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"SUPERADMIN" | "SUPPORT">("SUPPORT");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !staff) return;
    setEmail(staff.email);
    setName(staff.name);
    setRole(staff.role);
    setError("");
    setSaving(false);
  }, [open, staff]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setError("");

    const parsed = editStaffSchema.safeParse({
      email: email.trim(),
      name: name.trim(),
      role
    });
    if (!parsed.success) {
      setError("Please fill all fields correctly.");
      return;
    }

    setSaving(true);
    try {
      await api(`/platform/staff/${staff.id}`, {
        method: "PATCH",
        body: JSON.stringify(parsed.data)
      });
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit staff member"
      description="Update name, email, or role for this staff member."
      icon={<UserCheck className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" form="staff-edit-form" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      <form id="staff-edit-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-staff-name">Name</Label>
          <Input
            id="edit-staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-staff-email">Email</Label>
          <Input
            id="edit-staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-staff-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "SUPERADMIN" | "SUPPORT")}>
            <SelectTrigger aria-label="Select role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPPORT">Support Agent</SelectItem>
              <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </AppModal>
  );
}
