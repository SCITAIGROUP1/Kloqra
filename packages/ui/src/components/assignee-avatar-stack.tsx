"use client";

import { cn } from "../lib/utils.js";
import { UserAvatar } from "./shell/user-avatar.js";

export type AssigneeAvatarMember = {
  userId: string;
  userName: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type AssigneeAvatarStackProps = {
  members: AssigneeAvatarMember[];
  limit?: number;
  size?: "xs" | "sm";
  className?: string;
};

function OverflowHint({
  members,
  overflowCount,
  className
}: {
  members: AssigneeAvatarMember[];
  overflowCount: number;
  className?: string;
}) {
  const label = members.map((m) => m.userName).join(", ");

  return (
    <span
      className={cn("group/overflow relative inline-flex", className)}
      title={label}
      aria-label={`${overflowCount} more: ${label}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
        +{overflowCount}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden max-w-[14rem] -translate-x-1/2 rounded-lg border border-border/80 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md group-hover/overflow:block"
      >
        {label}
      </span>
    </span>
  );
}

export function AssigneeAvatarStack({
  members,
  limit = 3,
  size = "xs",
  className
}: AssigneeAvatarStackProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, limit);
  const overflow = members.slice(limit);

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((member, index) => (
        <UserAvatar
          key={member.userId}
          name={member.userName}
          firstName={member.firstName}
          lastName={member.lastName}
          size={size}
          className={cn(index > 0 && "-ml-2")}
        />
      ))}
      {overflow.length > 0 ? (
        <OverflowHint members={overflow} overflowCount={overflow.length} className="-ml-2" />
      ) : null}
    </div>
  );
}
