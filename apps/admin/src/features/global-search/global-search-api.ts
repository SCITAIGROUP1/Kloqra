import { ROUTES } from "@kloqra/contracts";
import type {
  CategoryListItemDto,
  ProjectListItemDto,
  TaskListItemDto,
  TeamMembersOverviewDto
} from "@kloqra/contracts";
import { buildListQuery, fetchPaginatedList } from "@kloqra/web-shared";
import {
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_RESULT_LIMIT,
  type GlobalSearchResult,
  type GlobalSearchViewAll
} from "./global-search-nav";
import {
  mapCategoryResults,
  mapPeopleResults,
  mapProjectResults,
  mapTaskResults
} from "./global-search-results";
import { api } from "@/lib/api";

export type GlobalSearchEntityGroup = {
  results: GlobalSearchResult[];
  viewAll?: GlobalSearchViewAll;
  error?: string;
};

export type GlobalSearchEntityResults = {
  projects: GlobalSearchEntityGroup;
  tasks: GlobalSearchEntityGroup;
  categories: GlobalSearchEntityGroup;
  people: GlobalSearchEntityGroup;
};

export const EMPTY_ENTITY_RESULTS: GlobalSearchEntityResults = {
  projects: { results: [] },
  tasks: { results: [] },
  categories: { results: [] },
  people: { results: [] }
};

async function fetchPeopleOverview(workspaceId: string, search: string) {
  const query = buildListQuery({
    page: 1,
    limit: GLOBAL_SEARCH_RESULT_LIMIT,
    search
  });
  return api<TeamMembersOverviewDto>(
    `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(workspaceId)}?${query}`,
    { workspaceId }
  );
}

export async function fetchGlobalSearchEntities(
  workspaceId: string,
  search: string
): Promise<GlobalSearchEntityResults> {
  if (!workspaceId || search.trim().length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
    return EMPTY_ENTITY_RESULTS;
  }

  const trimmed = search.trim();
  const listOptions = {
    workspaceId,
    page: 1,
    limit: GLOBAL_SEARCH_RESULT_LIMIT,
    search: trimmed
  };

  const [projectsOutcome, tasksOutcome, categoriesOutcome, peopleOutcome] =
    await Promise.allSettled([
      fetchPaginatedList<ProjectListItemDto>(ROUTES.PROJECTS.LIST, listOptions),
      fetchPaginatedList<TaskListItemDto>(ROUTES.TASKS.LIST, listOptions),
      fetchPaginatedList<CategoryListItemDto>(ROUTES.CATEGORIES.LIST, listOptions),
      fetchPeopleOverview(workspaceId, trimmed)
    ]);

  return {
    projects: resolvePaginatedGroup(projectsOutcome, (items, total) =>
      mapProjectResults(items, total, trimmed)
    ),
    tasks: resolvePaginatedGroup(tasksOutcome, (items, total) =>
      mapTaskResults(items, total, trimmed)
    ),
    categories: resolvePaginatedGroup(categoriesOutcome, (items, total) =>
      mapCategoryResults(items, total, trimmed)
    ),
    people: resolvePeopleGroup(peopleOutcome, trimmed)
  };
}

function resolvePaginatedGroup<T>(
  outcome: PromiseSettledResult<{ items: T[]; total: number }>,
  mapFn: (
    items: T[],
    total: number
  ) => { results: GlobalSearchResult[]; viewAll?: GlobalSearchViewAll }
): GlobalSearchEntityGroup {
  if (outcome.status === "rejected") {
    return { results: [], error: "Could not load results." };
  }

  const mapped = mapFn(outcome.value.items, outcome.value.total);
  return { results: mapped.results, viewAll: mapped.viewAll };
}

function resolvePeopleGroup(
  outcome: PromiseSettledResult<TeamMembersOverviewDto>,
  search: string
): GlobalSearchEntityGroup {
  if (outcome.status === "rejected") {
    return { results: [], error: "Could not load results." };
  }

  const mapped = mapPeopleResults(outcome.value.members, outcome.value.total, search);
  return { results: mapped.results, viewAll: mapped.viewAll };
}
