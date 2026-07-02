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
  TableHeader,
  TableRow,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@kloqra/ui";
import { usePlatformSessionStore } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PlatformStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const session = usePlatformSessionStore((s) => s.session);

  // Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("SUPPORT");
  const [newPassword, setNewPassword] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>("/platform/staff");
      setStaff(res.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.platformRole === "SUPERADMIN") {
      fetchStaff();
    }
  }, [session]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      await api("/platform/staff", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          password: newPassword
        })
      });
      setInviteOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await api(`/platform/staff/${id}`, { method: "DELETE" });
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (session?.platformRole !== "SUPERADMIN") {
    return <div className="p-6">Unauthorized. Only Super Admins can manage staff.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <AppBar
        title="Platform Staff"
        description="Manage super admins and support agents who have access to the platform portal."
        actions={<Button onClick={() => setInviteOpen(true)}>Invite Staff</Button>}
      />

      <DataTableCard>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading staff...</div>
        ) : error ? (
          <div className="p-6 text-destructive">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead>Role</DataTableHead>
                <DataTableHead className="text-right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <DataTableCell className="font-medium">{member.name}</DataTableCell>
                  <DataTableCell>{member.email}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={member.role === "SUPERADMIN" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    {member.id !== session?.user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </DataTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTableCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite Platform Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPORT">Support Agent</SelectItem>
                    <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Password</label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? "Inviting..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
