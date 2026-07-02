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
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

type StaffCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPERADMIN", "SUPPORT"]),
  password: z.string().min(8)
});

export function StaffCreateModal({ open, onOpenChange, onCreated }: StaffCreateModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"SUPERADMIN" | "SUPPORT">("SUPPORT");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setName("");
    setRole("SUPPORT");
    setPassword("");
    setError("");
    setSaving(false);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = createStaffSchema.safeParse({
      email: email.trim(),
      name: name.trim(),
      role,
      password
    });
    if (!parsed.success) {
      setError("Please fill all fields correctly. Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      await api("/platform/staff", {
        method: "POST",
        body: JSON.stringify(parsed.data)
      });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create staff member"
      description="Provision a new platform admin or support agent."
      icon={<Users className="h-5 w-5" />}
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
          <Button type="submit" form="staff-create-form" disabled={saving}>
            {saving ? "Creating…" : "Create staff"}
          </Button>
        </div>
      }
    >
      <form id="staff-create-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="staff-name">Name</Label>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-role">Role</Label>
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
        <div className="space-y-2">
          <Label htmlFor="staff-password">Initial Password</Label>
          <Input
            id="staff-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </AppModal>
  );
}
