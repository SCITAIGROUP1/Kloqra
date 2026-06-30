import { describe, expect, it } from "vitest";
import {
  buildTeamLiveMembers,
  countTeamLiveStatuses,
  deriveTeamLiveStatus,
  filterTeamLiveMembers,
  formatElapsedTimer,
  memberInitials
} from "./team-live-status";

const baseMember = {
  id: "m-1",
  userId: "u-1",
  userName: "Alex Morgan",
  userEmail: "alex@example.com",
  role: "MEMBER" as const,
  isActive: true,
  status: "active" as const,
  projectCount: 2,
  weekHours: 12,
  lastActiveAt: "2026-06-10T10:00:00.000Z",
  isTrackingNow: false
};

describe("deriveTeamLiveStatus", () => {
  it("returns active when presence is running", () => {
    expect(
      deriveTeamLiveStatus(baseMember, { isPaused: false }, Date.parse("2026-06-10T12:00:00.000Z"))
    ).toBe("active");
  });

  it("returns break when presence is paused", () => {
    expect(
      deriveTeamLiveStatus(baseMember, { isPaused: true }, Date.parse("2026-06-10T12:00:00.000Z"))
    ).toBe("break");
  });

  it("returns idle when recently active but not tracking", () => {
    expect(
      deriveTeamLiveStatus(
        { lastActiveAt: "2026-06-10T11:30:00.000Z" },
        undefined,
        Date.parse("2026-06-10T12:00:00.000Z")
      )
    ).toBe("idle");
  });

  it("returns offline when last active is stale", () => {
    expect(
      deriveTeamLiveStatus(
        { lastActiveAt: "2026-06-09T08:00:00.000Z" },
        undefined,
        Date.parse("2026-06-10T12:00:00.000Z")
      )
    ).toBe("offline");
  });
});

describe("buildTeamLiveMembers", () => {
  it("merges overview members with presence details", () => {
    const members = buildTeamLiveMembers(
      [baseMember],
      [
        {
          userId: "u-1",
          userName: "Alex Morgan",
          taskId: "t-1",
          taskName: "Dark mode",
          projectName: "Kloqra Platform",
          startedAt: "2026-06-10T11:00:00.000Z",
          isPaused: false
        }
      ],
      Date.parse("2026-06-10T12:00:00.000Z")
    );

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      status: "active",
      projectName: "Kloqra Platform",
      taskName: "Dark mode"
    });
  });
});

describe("countTeamLiveStatuses", () => {
  it("counts each status bucket", () => {
    const counts = countTeamLiveStatuses([
      { userId: "1", userName: "A", status: "active", lastActiveAt: null },
      { userId: "2", userName: "B", status: "active", lastActiveAt: null },
      { userId: "3", userName: "C", status: "idle", lastActiveAt: null },
      { userId: "4", userName: "D", status: "break", lastActiveAt: null },
      { userId: "5", userName: "E", status: "offline", lastActiveAt: null }
    ]);

    expect(counts).toEqual({ active: 2, idle: 1, break: 1, offline: 1 });
  });
});

describe("filterTeamLiveMembers", () => {
  const members = [
    {
      userId: "1",
      userName: "Sarah Johnson",
      status: "active" as const,
      projectName: "Kloqra Platform",
      taskName: "Dark mode",
      lastActiveAt: null
    },
    {
      userId: "2",
      userName: "Mike Chen",
      status: "offline" as const,
      lastActiveAt: "2026-06-09T08:00:00.000Z"
    }
  ];

  it("filters by status", () => {
    expect(filterTeamLiveMembers(members, "", "active")).toHaveLength(1);
    expect(filterTeamLiveMembers(members, "", "offline")).toHaveLength(1);
  });

  it("filters by search across name, project, and task", () => {
    expect(filterTeamLiveMembers(members, "dark", "all")).toHaveLength(1);
    expect(filterTeamLiveMembers(members, "mike", "all")).toHaveLength(1);
    expect(filterTeamLiveMembers(members, "platform", "all")).toHaveLength(1);
  });
});

describe("formatElapsedTimer", () => {
  it("formats hh:mm:ss", () => {
    expect(
      formatElapsedTimer("2026-06-10T10:00:00.000Z", Date.parse("2026-06-10T12:34:15.000Z"))
    ).toBe("2:34:15");
  });
});

describe("memberInitials", () => {
  it("uses first and last name initials", () => {
    expect(memberInitials("Sarah Johnson")).toBe("SJ");
  });
});
