"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { Calendar, Clock, FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function WorkDetailsSection({
  profile,
  onSave
}: {
  profile: UserProfileDto;
  onSave: (data: {
    jobTitle: string | null;
    department: string | null;
    workStartDate: string | null;
  }) => Promise<void>;
}) {
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? "");
  const [department, setDepartment] = useState(profile.department ?? "");
  const [workStartDate, setWorkStartDate] = useState(profile.workStartDate ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJobTitle(profile.jobTitle ?? "");
    setDepartment(profile.department ?? "");
    setWorkStartDate(profile.workStartDate ?? "");
  }, [profile]);

  const isDirty =
    (jobTitle || null) !== profile.jobTitle ||
    (department || null) !== profile.department ||
    (workStartDate || null) !== profile.workStartDate;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        jobTitle: jobTitle.trim() || null,
        department: department.trim() || null,
        workStartDate: workStartDate || null
      });
      toast.success("Work details saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save work details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold">Work Information</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-title">Job Title</Label>
            <Input id="job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-start">Start Date</Label>
            <Input
              id="work-start"
              type="date"
              value={workStartDate}
              onChange={(e) => setWorkStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourly-rate">Hourly Rate (Optional)</Label>
            <Input
              id="hourly-rate"
              value={profile.defaultHourlyRate != null ? String(profile.defaultHourlyRate) : "—"}
              disabled
              className="bg-muted/30"
            />
          </div>
        </div>
        <div className="mt-6">
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Total Hours</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {profile.activityStats.totalHours.toLocaleString()}h
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderKanban className="size-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Projects</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {profile.activityStats.projectCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Member Since</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatMemberSince(profile.activityStats.memberSince)}
          </p>
        </div>
      </div>
    </div>
  );
}
