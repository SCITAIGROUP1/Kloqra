import type { PresenceMemberDto, TeamMemberOverviewDto } from "@kloqra/contracts";

export type TeamLiveStatus = "active" | "idle" | "break" | "offline";

export type TeamLiveStatusFilter = "all" | TeamLiveStatus;

export const IDLE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export type TeamLiveMember = {
  userId: string;
  userName: string;
  status: TeamLiveStatus;
  projectName?: string;
  taskName?: string;
  startedAt?: string;
  isPaused?: boolean;
  lastActiveAt: string | null;
};

export function deriveTeamLiveStatus(
  member: Pick<TeamMemberOverviewDto, "lastActiveAt">,
  presence: Pick<PresenceMemberDto, "isPaused"> | undefined,
  now = Date.now()
): TeamLiveStatus {
  if (presence) {
    return presence.isPaused ? "break" : "active";
  }
  if (member.lastActiveAt) {
    const diff = now - new Date(member.lastActiveAt).getTime();
    if (diff >= 0 && diff < IDLE_THRESHOLD_MS) return "idle";
  }
  return "offline";
}

export function buildTeamLiveMembers(
  overviewMembers: TeamMemberOverviewDto[],
  presenceMembers: PresenceMemberDto[],
  now = Date.now()
): TeamLiveMember[] {
  const presenceByUserId = new Map(presenceMembers.map((p) => [p.userId, p]));

  return overviewMembers.map((member) => {
    const presence = presenceByUserId.get(member.userId);
    const status = deriveTeamLiveStatus(member, presence, now);

    return {
      userId: member.userId,
      userName: member.userName,
      status,
      projectName: presence?.projectName,
      taskName: presence?.taskName,
      startedAt: presence?.startedAt,
      isPaused: presence?.isPaused,
      lastActiveAt: member.lastActiveAt
    };
  });
}

export function countTeamLiveStatuses(members: TeamLiveMember[]) {
  return members.reduce(
    (acc, member) => {
      acc[member.status] += 1;
      return acc;
    },
    { active: 0, idle: 0, break: 0, offline: 0 }
  );
}

export function filterTeamLiveMembers(
  members: TeamLiveMember[],
  search: string,
  statusFilter: TeamLiveStatusFilter
): TeamLiveMember[] {
  const query = search.trim().toLowerCase();

  return members.filter((member) => {
    if (statusFilter !== "all" && member.status !== statusFilter) return false;
    if (!query) return true;

    const haystack = [member.userName, member.projectName, member.taskName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function formatElapsedTimer(startedAt: string, now = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
