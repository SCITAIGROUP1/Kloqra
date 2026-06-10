import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TeamMemberActions } from "./team-member-actions";

const member = {
  id: "m-1",
  workspaceId: "ws-1",
  userId: "u-1",
  userName: "Sam Rivera",
  userEmail: "sam@kloqra.dev",
  role: "MEMBER" as const,
  status: "active" as const,
  projectCount: 2,
  weekHours: 12,
  lastActiveAt: "2025-06-09T10:00:00.000Z",
  isTrackingNow: false,
  memberSince: "2025-01-01T00:00:00.000Z"
};

describe("TeamMemberActions", () => {
  it("renders You for the current user", () => {
    const html = renderToStaticMarkup(
      <TeamMemberActions
        member={member}
        isSelf
        busy={false}
        onViewProfile={vi.fn()}
        onEditMember={vi.fn()}
        onViewAsMember={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(html).toContain("You");
  });

  it("renders actions trigger for other members", () => {
    const html = renderToStaticMarkup(
      <TeamMemberActions
        member={member}
        isSelf={false}
        busy={false}
        onViewProfile={vi.fn()}
        onEditMember={vi.fn()}
        onViewAsMember={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(html).toContain('aria-label="Actions for Sam Rivera"');
  });
});
