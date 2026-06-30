"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterOptionsByQuery } from "../lib/filter-options.js";
import { cn } from "../lib/utils.js";
import { AssigneeAvatarStack } from "./assignee-avatar-stack.js";
import { UserAvatar } from "./shell/user-avatar.js";
import { Input } from "./ui/input.js";
import { Label } from "./ui/label.js";

export type TaskAssigneeOption = {
  userId: string;
  userName: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type TaskAssigneePickerProps = {
  members: TaskAssigneeOption[];
  value: string[];
  onChange: (userIds: string[]) => void;
  className?: string;
  disabled?: boolean;
};

export function TaskAssigneePicker({
  members,
  value,
  onChange,
  className,
  disabled = false
}: TaskAssigneePickerProps) {
  const selected = new Set(value);
  const allSelected = members.length > 0 && members.every((m) => selected.has(m.userId));

  const selectedMembers = useMemo(
    () => members.filter((m) => value.includes(m.userId)),
    [members, value]
  );

  const [open, setOpen] = useState(value.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const prevValueLength = useRef(value.length);

  const filteredMembers = useMemo(
    () =>
      filterOptionsByQuery(
        members.map((member) => ({
          ...member,
          value: member.userId,
          label: member.userName,
          keywords: member.email
        })),
        searchQuery
      ),
    [members, searchQuery]
  );

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  useEffect(() => {
    const prev = prevValueLength.current;
    prevValueLength.current = value.length;
    if (prev > 0 && value.length === 0) {
      setOpen(true);
    }
  }, [value.length]);

  function toggle(userId: string, checked: boolean) {
    if (checked) {
      onChange([...new Set([...value, userId])]);
      return;
    }
    onChange(value.filter((id) => id !== userId));
  }

  function toggleAll(checked: boolean) {
    onChange(checked ? members.map((m) => m.userId) : []);
  }

  if (members.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Add active team members before assigning tasks.
      </p>
    );
  }

  const summaryLabel =
    selectedMembers.length === 0 ? "Select assignees" : `${selectedMembers.length} selected`;

  return (
    <div className={cn("rounded-lg border border-border/70", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/30"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
          <span className="font-medium">{summaryLabel}</span>
        </span>
        {selectedMembers.length > 0 ? (
          <AssigneeAvatarStack members={selectedMembers} className="shrink-0" />
        ) : null}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/70 px-3 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or email…"
              className="h-8 border-border/70 bg-muted/20 pl-8 text-xs shadow-none"
              autoComplete="off"
              disabled={disabled}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input accent-primary"
              checked={allSelected}
              disabled={disabled}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            <span className="font-medium">Select all</span>
          </label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-3">
            {filteredMembers.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No members found.</p>
            ) : (
              filteredMembers.map((member) => {
                const id = `assignee-${member.userId}`;
                return (
                  <div key={member.userId} className="flex items-center gap-2.5">
                    <input
                      id={id}
                      type="checkbox"
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      checked={selected.has(member.userId)}
                      disabled={disabled}
                      onChange={(e) => toggle(member.userId, e.target.checked)}
                    />
                    <UserAvatar
                      name={member.userName}
                      firstName={member.firstName}
                      lastName={member.lastName}
                      size="xs"
                      className="ring-0"
                    />
                    <Label
                      htmlFor={id}
                      className="min-w-0 flex-1 cursor-pointer text-sm leading-snug"
                    >
                      <span className="font-medium">{member.userName}</span>
                      {member.email ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
