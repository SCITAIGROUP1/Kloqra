export const timelogQueryKeys = {
  all: ["timelogs"] as const,
  workspace: (workspaceId: string) => [...timelogQueryKeys.all, workspaceId] as const,
  list: (workspaceId: string, path: string) =>
    [...timelogQueryKeys.workspace(workspaceId), path] as const
};
