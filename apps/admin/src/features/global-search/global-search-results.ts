import type {
  CategoryListItemDto,
  ProjectListItemDto,
  TaskListItemDto,
  TeamMemberOverviewDto
} from "@kloqra/contracts";
import type { GlobalSearchResult, GlobalSearchViewAll } from "./global-search-nav";
import { projectListHref } from "@/features/projects/project-detail-nav";

export function mapProjectResults(
  items: ProjectListItemDto[],
  total: number,
  search: string
): { results: GlobalSearchResult[]; viewAll?: GlobalSearchViewAll } {
  const results = items.map((project) => ({
    id: `project:${project.id}`,
    type: "project" as const,
    label: project.name,
    subtitle: project.clientName ?? undefined,
    href: projectListHref(project.id)
  }));

  return {
    results,
    viewAll: buildViewAll("project", "Projects", "/projects", search, total)
  };
}

export function mapTaskResults(
  items: TaskListItemDto[],
  total: number,
  search: string
): { results: GlobalSearchResult[]; viewAll?: GlobalSearchViewAll } {
  const results = items
    .filter((task) => Boolean(task.projectId))
    .map((task) => ({
      id: `task:${task.id}`,
      type: "task" as const,
      label: task.taskName,
      subtitle: task.categoryName,
      href: `/projects/${task.projectId}/tasks`
    }));

  return {
    results,
    viewAll: buildViewAll("task", "Tasks", "/projects", search, total)
  };
}

export function mapCategoryResults(
  items: CategoryListItemDto[],
  total: number,
  search: string
): { results: GlobalSearchResult[]; viewAll?: GlobalSearchViewAll } {
  const results = items.map((category) => ({
    id: `category:${category.id}`,
    type: "category" as const,
    label: category.name,
    subtitle: category.description ?? undefined,
    href: "/categories"
  }));

  return {
    results,
    viewAll: buildViewAll("category", "Categories", "/categories", search, total)
  };
}

export function mapPeopleResults(
  items: TeamMemberOverviewDto[],
  total: number,
  search: string
): { results: GlobalSearchResult[]; viewAll?: GlobalSearchViewAll } {
  const results = items.map((member) => ({
    id: `person:${member.id}`,
    type: "person" as const,
    label: member.userName,
    subtitle: member.userEmail,
    href: "/team-management"
  }));

  return {
    results,
    viewAll: buildViewAll("person", "People", "/team-management", search, total)
  };
}

function buildViewAll(
  type: GlobalSearchViewAll["type"],
  label: string,
  basePath: string,
  search: string,
  total: number
): GlobalSearchViewAll | undefined {
  if (total <= 5) return undefined;
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const query = params.toString();
  return {
    type,
    label: `View all in ${label}`,
    href: query ? `${basePath}?${query}` : basePath
  };
}
