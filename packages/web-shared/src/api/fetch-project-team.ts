import { MAX_LIST_LIMIT, ROUTES, type ProjectTeamResponseDto } from "@kloqra/contracts";
import { api } from "./client";
import { appendListQuery, buildListQuery } from "./list-query";

export async function fetchProjectTeam(
  projectId: string,
  options: {
    workspaceId: string;
    page?: number;
    limit?: number;
    search?: string;
  }
): Promise<ProjectTeamResponseDto> {
  const query = buildListQuery({
    page: options.page ?? 1,
    limit: options.limit ?? MAX_LIST_LIMIT,
    search: options.search
  });
  return api<ProjectTeamResponseDto>(appendListQuery(ROUTES.PROJECTS.TEAM(projectId), query), {
    workspaceId: options.workspaceId
  });
}
