export type ExportScopeSummaryInput = {
  projectIds: string[];
  userIds: string[];
  projectNames?: string[];
  userNames?: string[];
  categoryName?: string;
  taskName?: string;
  teamOnly?: boolean;
};

export type ExportScopeSummary = {
  projectsLabel: string;
  membersLabel: string;
  extras: string[];
  isWorkspaceWide: boolean;
};

function formatNameList(
  names: string[],
  ids: string[],
  allLabel: string,
  countLabel: (count: number) => string,
  maxVisible = 2
): string {
  if (ids.length === 0) return allLabel;
  if (names.length === 0) return countLabel(ids.length);
  if (names.length === 1) return names[0]!;
  if (names.length <= maxVisible) return names.join(", ");
  const visible = names.slice(0, maxVisible).join(", ");
  return `${visible} (+${names.length - maxVisible} more)`;
}

export function buildExportScopeSummary(input: ExportScopeSummaryInput): ExportScopeSummary {
  const projectNames = input.projectNames ?? [];
  const userNames = input.userNames ?? [];

  const projectsLabel = formatNameList(
    projectNames,
    input.projectIds,
    "All projects",
    (count) => `${count} projects`
  );

  const membersLabel = formatNameList(
    userNames,
    input.userIds,
    "All team members",
    (count) => `${count} people`
  );

  const extras: string[] = [];
  if (input.categoryName) extras.push(`Category: ${input.categoryName}`);
  if (input.taskName) extras.push(`Task: ${input.taskName}`);
  if (input.teamOnly && input.projectIds.length > 0) extras.push("Project team only");

  const isWorkspaceWide =
    input.projectIds.length === 0 &&
    input.userIds.length === 0 &&
    !input.categoryName &&
    !input.taskName &&
    !input.teamOnly;

  return { projectsLabel, membersLabel, extras, isWorkspaceWide };
}
