import type { ListTimeLogOccupancyResponseDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  findOccupancyConflict,
  formatOverlapError,
  occupancyConflictLabel
} from "./calendar-utils";
import { api } from "@/lib/api";

export type OccupancyItem = ListTimeLogOccupancyResponseDto["items"][number];

export function overlapMessageFromItems(
  items: OccupancyItem[],
  start: Date,
  end: Date,
  timezone: string,
  excludeLogId?: string
): string | null {
  const conflict = findOccupancyConflict(items, start, end, excludeLogId);
  if (!conflict) return null;
  return formatOverlapError(
    occupancyConflictLabel(conflict),
    new Date(conflict.startTime),
    new Date(conflict.endTime),
    timezone
  );
}

export async function validateTimeEntryOverlap(
  workspaceId: string,
  start: Date,
  end: Date,
  timezone: string,
  excludeLogId?: string
): Promise<string | null> {
  const params = new URLSearchParams({
    from: start.toISOString(),
    to: end.toISOString()
  });
  const res = await api<ListTimeLogOccupancyResponseDto>(`${ROUTES.TIMELOGS.OCCUPANCY}?${params}`, {
    workspaceId
  });
  return overlapMessageFromItems(res.items, start, end, timezone, excludeLogId);
}
